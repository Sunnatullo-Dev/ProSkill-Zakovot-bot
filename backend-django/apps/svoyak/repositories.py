"""Svoyak — room/player operatsiyalari.

Hammasi atomic (transaction.atomic + select_for_update kerakli joylarda).
Race condition'larga himoyalangan (ikki o'yinchi bir vaqtda BUZZ bosa,
faqat birinchisining yozuvi qabul qilinadi).
"""
from __future__ import annotations

import secrets
import string
import time
import unicodedata
from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.core.exceptions import AppError

from .models import (
    SvoyakCategory,
    SvoyakPlayer,
    SvoyakQuestion,
    SvoyakRoom,
    SvoyakRoomCategorySnapshot,
    SvoyakRound,
)


def _now_ms() -> int:
    return int(time.time() * 1000)


def _normalize(text: str) -> str:
    """A/B/C/D taqqoslash uchun Unicode-aware normalize."""
    if text is None:
        return ""
    return unicodedata.normalize("NFC", text).strip().lower()


# ─── Kod generatsiya ─────────────────────────────────────────────────────────

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # I, O, 0, 1 olib tashlangan
CODE_LENGTH = 6
CODE_GEN_ATTEMPTS = 16


def _generate_code() -> str:
    """6-belgili noyob kod. I/O/0/1 chiqarib tashlandi (foydalanuvchi adashmasin)."""
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


# ─── Room operatsiyalari ─────────────────────────────────────────────────────

def create_room(
    *,
    host_telegram_id: int,
    host_display_name: str,
    category_ids: list[int],
    settings: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Yangi xona yaratadi va hostni birinchi o'yinchi sifatida qo'shadi.

    Doska uchun har bir kategoriya × 5 bal qiymati uchun random savol
    tanlanadi va `SvoyakRoomCategorySnapshot` da saqlanadi. Bir savol
    qaytadan ishlatilmaydi (xona davomida).
    """
    if host_telegram_id <= 0:
        raise AppError(401, "Mehmon Svoyak xonasi yaratolmaydi — Telegram orqali kiring")
    if not category_ids:
        raise AppError(400, "Hech bo'lmaganda bitta kategoriya tanlang")

    categories = list(
        SvoyakCategory.objects.filter(id__in=category_ids, is_active=True)
    )
    if not categories:
        raise AppError(400, "Aktiv kategoriyalar topilmadi")

    # Har kategoriyada har bal uchun savol bormi tekshirish va tanlash
    snapshots: list[tuple[SvoyakCategory, dict[int, int]]] = []
    for cat in categories:
        questions_by_value: dict[int, int] = {}
        for value in (10, 20, 30, 40, 50):
            qs = SvoyakQuestion.objects.filter(
                category=cat, value_tier=value, is_active=True
            )
            ids = list(qs.values_list("id", flat=True))
            if not ids:
                raise AppError(
                    400,
                    f"\"{cat.name}\" kategoriyasida {value} ballik savol yo'q",
                )
            # `secrets.choice` — predictable bo'lmasin
            questions_by_value[value] = secrets.choice(ids)
        snapshots.append((cat, questions_by_value))

    # Kod generatsiya — collision retry
    code = ""
    for _ in range(CODE_GEN_ATTEMPTS):
        candidate = _generate_code()
        if not SvoyakRoom.objects.filter(code=candidate).exists():
            code = candidate
            break
    if not code:
        raise AppError(500, "Xona kodi yaratib bo'lmadi, qaytadan urinib ko'ring")

    with transaction.atomic():
        room = SvoyakRoom.objects.create(
            code=code,
            host_telegram_id=host_telegram_id,
            status="lobby",
            settings=settings or {},
        )
        # Host avtomatik birinchi o'yinchi va `can_pick=True`.
        SvoyakPlayer.objects.create(
            room=room,
            telegram_id=host_telegram_id,
            display_name=host_display_name or f"Host #{host_telegram_id}",
            score=0,
            status="connected",
            can_pick=True,
        )
        for order_idx, (cat, q_by_val) in enumerate(snapshots):
            SvoyakRoomCategorySnapshot.objects.create(
                room=room,
                category=cat,
                questions_by_value={str(k): v for k, v in q_by_val.items()},
                used_value_tiers=[],
                order=order_idx,
            )

    return _serialize_room(room)


def find_room_by_code(code: str) -> SvoyakRoom | None:
    return SvoyakRoom.objects.filter(code=code.strip().upper()).first()


def join_room(
    *, code: str, telegram_id: int, display_name: str, role: str = "player"
) -> dict[str, Any]:
    """O'yinchini xonaga qo'shadi yoki qaytib ulanishini tasdiqlaydi.

    role: "player" | "coordinator" — koordinator savol o'qiydi, ball olmaydi.
    """
    if telegram_id <= 0:
        raise AppError(401, "Mehmon Svoyak xonasiga qo'shilolmaydi")
    if role not in ("player", "coordinator"):
        role = "player"
    normalized = code.strip().upper()

    with transaction.atomic():
        room = (
            SvoyakRoom.objects.select_for_update()
            .filter(code=normalized)
            .first()
        )
        if not room:
            raise AppError(404, "Bu kod bilan xona topilmadi")
        if room.status == "finished":
            raise AppError(409, "Xona tugagan")

        max_players = int(room.settings.get("max_players", 8))
        existing = SvoyakPlayer.objects.select_for_update().filter(
            room=room, telegram_id=telegram_id
        ).first()
        if existing:
            # Qaytib ulanish — disconnect→connect.
            existing.status = "connected"
            existing.display_name = display_name or existing.display_name
            # auto_now=True maydon update_fields bilan avtomatik yangilanmaydi,
            # shuning uchun qo'lda o'rnatamiz.
            existing.last_seen_at = timezone.now()
            existing.save(update_fields=["status", "display_name", "last_seen_at"])
        else:
            # Koordinator uchun o'yinchi soni chegarasi qo'llanilmaydi
            if role == "player":
                current_count = SvoyakPlayer.objects.filter(
                    room=room, status__in=["connected", "disconnected"], role="player"
                ).count()
                if current_count >= max_players:
                    raise AppError(409, "Xona to'lib qolgan")
            try:
                SvoyakPlayer.objects.create(
                    room=room,
                    telegram_id=telegram_id,
                    display_name=display_name or f"Player #{telegram_id}",
                    score=0,
                    status="connected",
                    can_pick=False,
                    role=role,
                )
            except IntegrityError:
                raise AppError(409, "Allaqachon ulangansiz")

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def leave_room(*, code: str, telegram_id: int) -> None:
    """O'yinchi chiqib ketadi. Host chiqsa xona finished bo'ladi."""
    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(
            code=code.strip().upper()
        ).first()
        if not room:
            return
        player = SvoyakPlayer.objects.select_for_update().filter(
            room=room, telegram_id=telegram_id
        ).first()
        if not player:
            return
        # Lobby'da bo'lsa to'liq o'chirish, o'yin'da bo'lsa disconnected.
        if room.status == "lobby":
            player.delete()
        else:
            player.status = "disconnected"
            # auto_now=True maydon update_fields bilan avtomatik yangilanmaydi.
            player.last_seen_at = timezone.now()
            player.save(update_fields=["status", "last_seen_at"])

        if room.host_telegram_id == telegram_id and room.status != "finished":
            # Host chiqdi — xona tugadi.
            room.status = "finished"
            room.finished_at = timezone.now()
            room.save(update_fields=["status", "finished_at"])


# ─── State (polling endpoint uchun) ──────────────────────────────────────────

def get_room_state(code: str, *, viewer_telegram_id: int) -> dict[str, Any]:
    """O'yin holatini barcha kerakli ma'lumotlar bilan qaytaradi.

    Tez bo'lishi kerak — har client har 500ms chaqiradi.
    """
    room = (
        SvoyakRoom.objects
        .select_related("current_round")
        .filter(code=code.strip().upper())
        .first()
    )
    if not room:
        raise AppError(404, "Xona topilmadi")

    return _serialize_room(room, viewer_telegram_id=viewer_telegram_id)


# ─── O'yin mexanikasi ───────────────────────────────────────────────────────

def start_game(*, code: str, telegram_id: int) -> dict[str, Any]:
    """Host xonani lobby'dan playing'ga o'tkazadi.

    Talablar: faqat host, 2+ o'yinchi, status oldindan lobby.
    Birinchi pick huquqi host'da qoladi.
    """
    normalized = code.strip().upper()
    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        if room.host_telegram_id != telegram_id:
            raise AppError(403, "Faqat host o'yinni boshlay oladi")
        if room.status != "lobby":
            raise AppError(409, f"Xona '{room.status}' holatda — endi boshlash mumkin emas")

        active_count = SvoyakPlayer.objects.filter(
            room=room, status="connected", role="player"  # koordinatorni hisoblamaymiz
        ).count()
        if active_count < 2:
            raise AppError(409, "Kamida 2 ta ulangan o'yinchi kerak")

        room.status = "playing"
        room.started_at = timezone.now()
        room.save(update_fields=["status", "started_at"])

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def pick_question(
    *,
    code: str,
    telegram_id: int,
    category_id: int,
    value_tier: int,
) -> dict[str, Any]:
    """Pick huquqiga ega o'yinchi mavzu + ball tanlaydi.

    Yangi Round yaratiladi. Boshlanish: status='reading' (savol o'qilmoqda).
    Mijoz tomonida TTS yoki taymer bilan keyin status='waiting_buzz' ga
    ko'chish kerak — buni `open_buzz` funksiyasi qiladi.
    """
    if value_tier not in (10, 20, 30, 40, 50):
        raise AppError(400, "valueTier 10/20/30/40/50 dan birortasi bo'lishi shart")

    normalized = code.strip().upper()
    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        if room.status != "playing":
            raise AppError(409, f"Xona '{room.status}' holatda — pick mumkin emas")

        # Pick huquqi tekshirish
        picker = SvoyakPlayer.objects.select_for_update().filter(
            room=room, telegram_id=telegram_id
        ).first()
        if not picker:
            raise AppError(403, "Siz bu xonada emassiz")
        if not picker.can_pick:
            raise AppError(403, "Hozir sizning navbatingiz emas")

        # Avvalgi round hali tugamagan bo'lsa, yangi pick yo'q
        if room.current_round_id:
            cr = SvoyakRound.objects.filter(id=room.current_round_id).first()
            if cr and cr.status not in ("completed", "skipped"):
                raise AppError(409, "Avvalgi raund hali tugamagan")

        # Snapshot tekshirish: shu kategoriya bormi va shu ball ishlatilmaganmi?
        snapshot = SvoyakRoomCategorySnapshot.objects.select_for_update().filter(
            room=room, category_id=category_id
        ).first()
        if not snapshot:
            raise AppError(404, "Bu kategoriya doskaning ichida yo'q")
        used = list(snapshot.used_value_tiers or [])
        if value_tier in used:
            raise AppError(409, "Bu savol allaqachon o'tilgan")

        # Snapshot'da oldindan tanlangan savol ID'sini olamiz
        q_id = snapshot.questions_by_value.get(str(value_tier))
        if not q_id:
            raise AppError(500, "Doska snapshot'ida savol topilmadi (data integrity)")
        question = SvoyakQuestion.objects.filter(id=q_id).first()
        if not question:
            raise AppError(500, "Savol bazasidan o'chirilgan")

        # Yangi Round yaratamiz
        new_round = SvoyakRound.objects.create(
            room=room,
            question=question,
            value=value_tier,
            status="reading",
            buzz_attempts=[],
        )
        room.current_round = new_round
        room.save(update_fields=["current_round"])

        # Snapshot'da ball'ni ishlatilgan deb belgilaymiz
        snapshot.used_value_tiers = used + [value_tier]
        snapshot.save(update_fields=["used_value_tiers"])

        # Pick huquqini olib qo'yamiz — javob bergandan keyin keyingi pick
        # ovqatlangan o'yinchiga qaytariladi (answer/skip ichida).
        picker.can_pick = False
        picker.save(update_fields=["can_pick"])

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def open_buzz(*, code: str, telegram_id: int) -> dict[str, Any]:
    """Savol o'qish tugagandan keyin BUZZ rejimini ochish.

    Spec: foydalanuvchi savol o'qib bo'lishini kutadi, keyin tugma yashil
    rangga o'tadi. Bu host yoki avtomatik (frontend taymer) chaqiradi.
    """
    normalized = code.strip().upper()
    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room or not room.current_round_id:
            raise AppError(404, "Aktiv raund yo'q")
        # Faqat host yoki koordinator buzz ochish huquqiga ega
        is_coordinator = SvoyakPlayer.objects.filter(
            room=room, telegram_id=telegram_id, role="coordinator"
        ).exists()
        if room.host_telegram_id != telegram_id and not is_coordinator:
            raise AppError(403, "Faqat host yoki koordinator buzz'ni ocha oladi")

        round_row = SvoyakRound.objects.select_for_update().filter(
            id=room.current_round_id
        ).first()
        if not round_row:
            raise AppError(404, "Raund topilmadi")
        if round_row.status != "reading":
            raise AppError(409, f"Raund '{round_row.status}' holatda")

        round_row.status = "waiting_buzz"
        round_row.buzz_opened_at = timezone.now()
        round_row.save(update_fields=["status", "buzz_opened_at"])

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def buzz(*, code: str, telegram_id: int) -> dict[str, Any]:
    """O'yinchi BUZZ bosadi. Birinchi kelgan g'olib.

    Race condition: select_for_update + immediate check. Server timestamp
    authoritative — clientlar yuborgan vaqtlarni e'tibordan chiqaramiz
    (cheat'lashning oldini olish).
    """
    normalized = code.strip().upper()
    now_ms = _now_ms()

    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room or not room.current_round_id:
            raise AppError(404, "Aktiv raund yo'q")

        round_row = SvoyakRound.objects.select_for_update().filter(
            id=room.current_round_id
        ).first()
        if not round_row:
            raise AppError(404, "Raund topilmadi")

        player = SvoyakPlayer.objects.filter(
            room=room, telegram_id=telegram_id
        ).first()
        if not player:
            raise AppError(403, "Siz bu xonada emassiz")
        if player.status != "connected":
            raise AppError(403, "Ulangan emassiz")
        # Koordinator BUZZ bosa olmaydi — faqat savol o'qiydi
        if player.role == "coordinator":
            raise AppError(403, "Koordinator buzz bosa olmaydi")

        # Status reading bo'lsa — savol o'qilmoqda, hali bosish mumkin emas.
        # Bu yagona "haqiqiy" xato (cheat'ga urinish).
        if round_row.status == "reading":
            raise AppError(409, "BUZZ hali ochilmagan, savol o'qilmoqda")

        # Faqat birinchi g'olib status'ni waiting_buzz -> answering qiladi.
        # Kech qolganlar ham qabul qilinadi (frontend "Kech qoldingiz" ko'rsatadi),
        # lekin status o'zgarmaydi.
        if round_row.status == "waiting_buzz" and round_row.buzz_winner_id is None:
            round_row.buzz_winner = player
            round_row.buzz_winner_at_ms = now_ms
            round_row.status = "answering"
            attempts = list(round_row.buzz_attempts or [])
            attempts.append({"telegramId": telegram_id, "atMs": now_ms, "winner": True})
            round_row.buzz_attempts = attempts
            round_row.save(update_fields=[
                "buzz_winner", "buzz_winner_at_ms", "status", "buzz_attempts"
            ])
            player.last_buzz_at_ms = now_ms
            player.save(update_fields=["last_buzz_at_ms"])
        else:
            # G'olib allaqachon belgilangan yoki status answering — kech buzz,
            # log saqlaymiz. Frontend `buzzAttempts` orqali yoki state pollingdan
            # foydalanuvchiga "Kech qoldingiz" ko'rsatadi.
            attempts = list(round_row.buzz_attempts or [])
            attempts.append({"telegramId": telegram_id, "atMs": now_ms, "winner": False})
            round_row.buzz_attempts = attempts
            round_row.save(update_fields=["buzz_attempts"])

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def submit_answer(
    *,
    code: str,
    telegram_id: int,
    answer_text: str,
) -> dict[str, Any]:
    """Buzz g'olibi javob yuboradi.

    A/B/C/D rejimi: aniq taqqoslash. Erkin matn: Gemini (yoki keyinroq).
    To'g'ri: +value, Noto'g'ri: -value.
    Round status='completed' bo'ladi. Pick huquqi:
        - To'g'ri javob bersa: shu o'yinchi
        - Noto'g'ri yoki javob bermasa: boshqalardan birortasi (random)
    """
    normalized = code.strip().upper()
    trimmed = (answer_text or "").strip()

    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room or not room.current_round_id:
            raise AppError(404, "Aktiv raund yo'q")

        round_row = SvoyakRound.objects.select_for_update().select_related(
            "question", "buzz_winner"
        ).filter(id=room.current_round_id).first()
        if not round_row:
            raise AppError(404, "Raund topilmadi")
        if round_row.status != "answering":
            raise AppError(409, f"Raund '{round_row.status}' holatda — javob qabul qilinmaydi")
        if not round_row.buzz_winner_id:
            raise AppError(409, "Buzz g'olibi yo'q (kutilmagan holat)")
        if round_row.buzz_winner.telegram_id != telegram_id:
            raise AppError(403, "Faqat buzz'ni yutgan o'yinchi javob bera oladi")

        question = round_row.question
        is_correct = False

        if question.question_type == "abcd" and isinstance(question.wrong_answers, list):
            valid_options = {
                _normalize(opt)
                for opt in [question.correct_answer, *question.wrong_answers]
                if isinstance(opt, str)
            }
            if _normalize(trimmed) not in valid_options:
                # Foydalanuvchi noto'g'ri variant yubordi (xato/cheat) — incorrect
                is_correct = False
            else:
                is_correct = _normalize(trimmed) == _normalize(question.correct_answer)
        else:
            # Erkin matn — Gemini AI bilan fuzzy matching (solo o'yindagi kabi).
            # "Alisher Navoiy" → "Navoiy" ham to'g'ri deb hisoblanadi.
            from apps.answers.gemini import check_answer as gemini_check_answer
            result = gemini_check_answer(question.text, question.correct_answer, trimmed)
            is_correct = result.status == "correct"

        delta = round_row.value if is_correct else -round_row.value
        round_row.answer_text = trimmed
        round_row.answer_correct = is_correct
        round_row.score_delta = delta
        round_row.status = "completed"
        round_row.ended_at = timezone.now()
        round_row.save(update_fields=[
            "answer_text", "answer_correct", "score_delta", "status", "ended_at"
        ])

        # Score yangilash
        winner = SvoyakPlayer.objects.select_for_update().filter(
            id=round_row.buzz_winner_id
        ).first()
        if winner:
            winner.score = winner.score + delta
            winner.save(update_fields=["score"])

        # Pick huquqini yangilash
        _reassign_pick(room, prefer_player_id=winner.id if (winner and is_correct) else None)

        # O'yin avtomatik tugaganini tekshirish
        _maybe_finish(room)

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def skip_round(*, code: str, telegram_id: int) -> dict[str, Any]:
    """Host yoki o'zi pass qiladi. Javob hech kim bermadi.

    Pick huquqi keyingi o'yinchiga. Score o'zgarmaydi.
    """
    normalized = code.strip().upper()
    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room or not room.current_round_id:
            raise AppError(404, "Aktiv raund yo'q")

        round_row = SvoyakRound.objects.select_for_update().filter(
            id=room.current_round_id
        ).first()
        if not round_row:
            raise AppError(404, "Raund topilmadi")
        if round_row.status in ("completed", "skipped"):
            raise AppError(409, "Raund allaqachon tugagan")

        # Faqat host, buzz_winner yoki koordinator skip qila oladi
        is_host = telegram_id == room.host_telegram_id
        is_winner = round_row.buzz_winner and round_row.buzz_winner.telegram_id == telegram_id
        is_coordinator = SvoyakPlayer.objects.filter(
            room=room, telegram_id=telegram_id, role="coordinator"
        ).exists()
        if not (is_host or is_winner or is_coordinator):
            raise AppError(403, "Faqat host, koordinator yoki buzz g'olibi skip qila oladi")

        round_row.status = "skipped"
        round_row.score_delta = 0
        round_row.ended_at = timezone.now()
        round_row.save(update_fields=["status", "score_delta", "ended_at"])

        _reassign_pick(room, prefer_player_id=None)
        _maybe_finish(room)

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


def end_game(*, code: str, telegram_id: int) -> dict[str, Any]:
    """Host xohlasa xonani majburiy tugatadi (barcha savollargacha kutmasdan)."""
    normalized = code.strip().upper()
    with transaction.atomic():
        room = SvoyakRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        if room.host_telegram_id != telegram_id:
            raise AppError(403, "Faqat host xonani tugatishi mumkin")
        if room.status == "finished":
            return get_room_state(normalized, viewer_telegram_id=telegram_id)
        room.status = "finished"
        room.finished_at = timezone.now()
        room.save(update_fields=["status", "finished_at"])

    return get_room_state(normalized, viewer_telegram_id=telegram_id)


# ─── Yordamchi (private) funksiyalar ────────────────────────────────────────

def _reassign_pick(room: SvoyakRoom, *, prefer_player_id: int | None) -> None:
    """Pick huquqini keyingi o'yinchiga beradi.

    To'g'ri javob bergan o'yinchi (prefer_player_id) — agar ulangan bo'lsa,
    shunga. Aks holda eng past ballik ulangan o'yinchiga (oddiy "adolatli"
    qoida — spec'da aniq emas, lekin standartda shunday).
    """
    # Avval barcha can_pick ni o'chiramiz
    SvoyakPlayer.objects.filter(room=room).update(can_pick=False)

    candidates = list(
        SvoyakPlayer.objects.filter(
            room=room, status="connected", role="player"  # koordinatorni chiqarib tashlaymiz
        ).order_by("score", "joined_at")
    )
    if not candidates:
        return

    if prefer_player_id:
        for p in candidates:
            if p.id == prefer_player_id:
                p.can_pick = True
                p.save(update_fields=["can_pick"])
                return

    # Eng past ballik
    candidates[0].can_pick = True
    candidates[0].save(update_fields=["can_pick"])


def _maybe_finish(room: SvoyakRoom) -> None:
    """Agar barcha savol ishlatilgan bo'lsa, o'yinni tugatadi."""
    snapshots = list(SvoyakRoomCategorySnapshot.objects.filter(room=room))
    if not snapshots:
        return
    total_questions = len(snapshots) * 5  # har kategoriyada 5 bal
    used = sum(len(s.used_value_tiers or []) for s in snapshots)
    if used >= total_questions:
        room.status = "finished"
        room.finished_at = timezone.now()
        room.save(update_fields=["status", "finished_at"])


# ─── Serializatsiya ──────────────────────────────────────────────────────────

def _serialize_player(p: SvoyakPlayer) -> dict[str, Any]:
    return {
        "telegramId": p.telegram_id,
        "displayName": p.display_name,
        "avatarUrl": p.avatar_url or None,
        "score": p.score,
        "status": p.status,
        "role": p.role,  # "player" | "coordinator"
        "canPick": p.can_pick,
        "isHost": p.telegram_id == p.room.host_telegram_id,
    }


def _serialize_round(r: SvoyakRound | None, *, viewer_telegram_id: int) -> dict[str, Any] | None:
    if r is None:
        return None
    # Buzz g'olibi — kim javob beryapti?
    winner_id = r.buzz_winner.telegram_id if r.buzz_winner else None
    return {
        "id": r.id,
        "questionId": r.question_id,
        "questionText": r.question.text,
        "questionType": r.question.question_type,
        # Public — to'g'ri javob YASHIRIN; faqat status=completed bo'lsa beriladi.
        "options": _shuffled_options(r.question) if r.question.question_type == "abcd" else [],
        "value": r.value,
        "status": r.status,
        "startedAt": r.started_at.isoformat() if r.started_at else None,
        "buzzWinnerTelegramId": winner_id,
        "buzzWinnerAtMs": r.buzz_winner_at_ms,
        "isMyTurn": winner_id == viewer_telegram_id,
        "answerCorrect": r.answer_correct if r.status == "completed" else None,
        "correctAnswer": r.question.correct_answer if r.status in ("completed", "skipped") else None,
        "scoreDelta": r.score_delta if r.status == "completed" else None,
    }


def _shuffled_options(q: SvoyakQuestion) -> list[str]:
    """A/B/C/D rejimi — 4 ta variant aralashtirilgan."""
    raw_wrong = q.wrong_answers if isinstance(q.wrong_answers, list) else []
    wrong = [str(x) for x in raw_wrong if isinstance(x, str) and x.strip()]
    if len(wrong) != 3 or not q.correct_answer:
        return []
    pool = [q.correct_answer, *wrong]
    for i in range(len(pool) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        pool[i], pool[j] = pool[j], pool[i]
    return pool


def _serialize_room(room: SvoyakRoom, *, viewer_telegram_id: int | None = None) -> dict[str, Any]:
    viewer = viewer_telegram_id or 0
    players = list(room.players.all().select_related("room"))
    snapshots = list(
        room.category_snapshots.all().select_related("category")
    )
    return {
        "code": room.code,
        "status": room.status,
        "hostTelegramId": room.host_telegram_id,
        "createdAt": room.created_at.isoformat() if room.created_at else None,
        "startedAt": room.started_at.isoformat() if room.started_at else None,
        "settings": room.settings,
        "players": [_serialize_player(p) for p in players],
        "board": [
            {
                "categoryId": s.category_id,
                "categoryName": s.category.name,
                "categoryIcon": s.category.icon_emoji,
                "order": s.order,
                "usedValueTiers": s.used_value_tiers,
            }
            for s in snapshots
        ],
        "currentRound": _serialize_round(room.current_round, viewer_telegram_id=viewer)
        if room.current_round_id
        else None,
        "viewerTelegramId": viewer,
        "viewerIsHost": viewer == room.host_telegram_id,
    }
