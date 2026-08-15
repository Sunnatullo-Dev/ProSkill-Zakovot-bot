"""Interaktiv Zakovat Stoli — barcha biznes logika.

Hammasi atomic (transaction.atomic + select_for_update kerakli joylarda),
gamerooms/svoyak repositories'dagi bir xil naqsh: race condition'lardan
himoyalangan (ikki kishi bir vaqtda qo'shilsa, faqat biri 6-o'rindiqni oladi;
ikki admin bir vaqtda spin bossa, faqat biri savolni oladi).

Bu rejimda baholash Gemini bilan EMAS — admin qo'lda "To'g'ri"/"Noto'g'ri"
tugmasini bosadi (spec talabi). Shu sababli bu yerda LLM chaqiruvi yo'q.

Leak oldini olish:
    Savolning to'g'ri javobi FAQAT xona adminiga ko'rsatiladi (`viewer_telegram_id`
    xona admini bilan mos kelsa). Kapitan javobi ham faqat adminga ko'rinadi —
    bu spec'dagi "Message 6 — admin-only verification prompt" talabiga mos.
"""
from __future__ import annotations

import re
import secrets
from datetime import timedelta
from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.core.exceptions import AppError

from .models import (
    DISCUSSION_SECONDS,
    QUESTION_COUNT,
    TEAM_SIZE,
    WIN_SCORE,
    ZtPlayer,
    ZtQuestion,
    ZtRoom,
    ZtSpectator,
)


# ─── Kod generatsiya ─────────────────────────────────────────────────────────
# Spec namunasidagi "#ZK-7845" uslubiga mos — 4 xonali raqamli kod.
# Bot xabarlarida "#ZK-<code>" ko'rinishida ko'rsatiladi.

CODE_MIN = 1000
CODE_MAX = 9999
CODE_GEN_ATTEMPTS = 20


def _generate_code() -> str:
    return str(secrets.randbelow(CODE_MAX - CODE_MIN + 1) + CODE_MIN)


def normalize_code(raw: str) -> str:
    """Foydalanuvchi "7845", "ZK-7845", "#ZK-7845" — har qanday ko'rinishda
    kiritishi mumkin. Faqat harf/raqamlarni qoldirib, boshidagi "ZK" prefiksini
    olib tashlaymiz."""
    cleaned = re.sub(r"[^A-Z0-9]", "", (raw or "").upper())
    if cleaned.startswith("ZK"):
        cleaned = cleaned[2:]
    return cleaned


# ─── Yordamchilar ─────────────────────────────────────────────────────────────

def _require_room_admin(room: ZtRoom, telegram_id: int) -> None:
    if not room.is_room_admin(telegram_id):
        raise AppError(403, "Faqat xona admini bu amalni bajarishi mumkin")


def get_room(code: str) -> ZtRoom:
    room = ZtRoom.objects.filter(code=normalize_code(code)).first()
    if not room:
        raise AppError(404, "Bu kod bilan xona topilmadi")
    return room


def _serialize_room(room: ZtRoom, viewer_telegram_id: int | None = None) -> dict[str, Any]:
    players = list(room.players.all())
    is_admin_viewer = viewer_telegram_id is not None and room.is_room_admin(viewer_telegram_id)
    captain = next((p for p in players if p.is_captain), None)

    cq = room.current_question
    current_question = None
    if cq is not None:
        current_question = {"id": cq.id, "sector": cq.sector, "text": cq.text}
        if is_admin_viewer:
            current_question["answer"] = cq.answer

    discussion_seconds_remaining = None
    if room.discussion_deadline:
        remaining = (room.discussion_deadline - timezone.now()).total_seconds()
        discussion_seconds_remaining = max(0, round(remaining))

    data: dict[str, Any] = {
        "code": room.code,
        "displayCode": f"ZK-{room.code}",
        "status": room.status,
        "adminTelegramId": room.admin_telegram_id,
        "teamScore": room.team_score,
        "fansScore": room.fans_score,
        "winner": room.winner or None,
        "players": [
            {
                "seat": p.seat,
                "telegramId": p.telegram_id,
                "displayName": p.display_name,
                "isCaptain": p.is_captain,
            }
            for p in players
        ],
        "playerCount": len(players),
        "teamFull": len(players) >= TEAM_SIZE,
        "captainTelegramId": captain.telegram_id if captain else None,
        "captainName": captain.display_name if captain else None,
        "questionsTotal": room.questions.count(),
        "questionsUsed": room.questions.filter(used=True).count(),
        "currentQuestion": current_question,
        "discussionSeconds": DISCUSSION_SECONDS,
        "discussionDeadline": room.discussion_deadline.isoformat() if room.discussion_deadline else None,
        "discussionSecondsRemaining": discussion_seconds_remaining,
        "spectatorCount": room.spectators.count(),
        "createdAt": room.created_at.isoformat(),
        "startedAt": room.started_at.isoformat() if room.started_at else None,
        "finishedAt": room.finished_at.isoformat() if room.finished_at else None,
        "viewerTelegramId": viewer_telegram_id,
        "viewerIsAdmin": is_admin_viewer,
    }
    if is_admin_viewer:
        data["captainAnswerText"] = room.captain_answer_text
        data["captainAnswerIsVoice"] = room.captain_answer_is_voice
    return data


def get_room_state(code: str, *, viewer_telegram_id: int | None = None) -> dict[str, Any]:
    room = get_room(code)
    return _serialize_room(room, viewer_telegram_id=viewer_telegram_id)


# ─── Xona yaratish ────────────────────────────────────────────────────────────

def create_room(*, admin_telegram_id: int) -> dict[str, Any]:
    if admin_telegram_id <= 0:
        raise AppError(401, "Faqat Telegram foydalanuvchilar xona yaratishi mumkin")

    code = ""
    for _ in range(CODE_GEN_ATTEMPTS):
        candidate = _generate_code()
        if not ZtRoom.objects.filter(code=candidate).exists():
            code = candidate
            break
    if not code:
        raise AppError(500, "Xona kodi yaratib bo'lmadi, qaytadan urinib ko'ring")

    room = ZtRoom.objects.create(code=code, admin_telegram_id=admin_telegram_id, status="waiting")
    return _serialize_room(room, viewer_telegram_id=admin_telegram_id)


def list_admin_rooms(*, admin_telegram_id: int) -> list[dict[str, Any]]:
    """Adminning oxirgi xonalari — panel yo'qolib qolsa qayta ochish uchun."""
    rooms = ZtRoom.objects.filter(admin_telegram_id=admin_telegram_id).order_by("-created_at")[:15]
    return [_serialize_room(r, viewer_telegram_id=admin_telegram_id) for r in rooms]


# ─── Qo'shilish ────────────────────────────────────────────────────────────────

def join_player(*, code: str, telegram_id: int, display_name: str) -> dict[str, Any]:
    """Birinchi 6 kishi o'yinchi bo'lib qo'shiladi. 1-bo'lib qo'shilgan — kapitan."""
    if telegram_id <= 0:
        raise AppError(401, "Faqat Telegram foydalanuvchilar qo'shilishi mumkin")

    display_name = (display_name or "").strip()
    if not display_name:
        raise AppError(400, "Ism bo'sh bo'lmasligi kerak")
    if len(display_name) > 120:
        display_name = display_name[:120]

    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Bu kod bilan xona topilmadi")

        existing = ZtPlayer.objects.filter(room=room, telegram_id=telegram_id).first()
        if existing:
            if display_name != existing.display_name:
                existing.display_name = display_name
                existing.save(update_fields=["display_name"])
            return _serialize_room(room, viewer_telegram_id=telegram_id)

        if room.status != "waiting":
            raise AppError(409, "Jamoa allaqachon shakllangan — endi o'yinchi sifatida qo'shilib bo'lmaydi")

        seat_count = room.players.count()
        if seat_count >= TEAM_SIZE:
            raise AppError(409, "Jamoa to'liq (6/6) — band")

        seat = seat_count + 1
        try:
            ZtPlayer.objects.create(
                room=room,
                telegram_id=telegram_id,
                display_name=display_name,
                seat=seat,
                is_captain=(seat == 1),
            )
        except IntegrityError:
            raise AppError(409, "Joy band bo'lib qoldi — qaytadan urinib ko'ring")

    return _serialize_room(room, viewer_telegram_id=telegram_id)


def join_spectator(*, code: str, telegram_id: int) -> dict[str, Any]:
    """'O'yinni kuzatish' — o'yin holatiga ta'sir qilmaydi, faqat kuzatadi."""
    if telegram_id <= 0:
        raise AppError(401, "Faqat Telegram foydalanuvchilar kuzatishi mumkin")

    normalized = normalize_code(code)
    room = ZtRoom.objects.filter(code=normalized).first()
    if not room:
        raise AppError(404, "Bu kod bilan xona topilmadi")

    try:
        ZtSpectator.objects.get_or_create(room=room, telegram_id=telegram_id)
    except IntegrityError:
        pass  # allaqachon qo'shilgan — race, muammo emas

    return _serialize_room(room, viewer_telegram_id=telegram_id)


# ─── Admin: jamoa va o'yin boshqaruvi ─────────────────────────────────────────

def confirm_team(*, code: str, admin_telegram_id: int) -> dict[str, Any]:
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        _require_room_admin(room, admin_telegram_id)
        if room.status != "waiting":
            raise AppError(409, f"Xona '{room.status}' holatda — tasdiqlash mumkin emas")
        count = room.players.count()
        if count < TEAM_SIZE:
            raise AppError(409, f"Jamoa hali to'liq emas ({count}/{TEAM_SIZE})")
        room.status = "team_confirmed"
        room.save(update_fields=["status"])

    return _serialize_room(room, viewer_telegram_id=admin_telegram_id)


def upload_questions(*, code: str, admin_telegram_id: int, questions: list[dict[str, str]]) -> dict[str, Any]:
    """Roppa-rosa 12 ta savol — bir martada yuklanadi, keyin o'zgartirilmaydi."""
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        _require_room_admin(room, admin_telegram_id)
        if room.status not in ("waiting", "team_confirmed"):
            raise AppError(409, "Savollar faqat o'yin boshlanishidan oldin yuklanadi")
        if room.questions.exists():
            raise AppError(409, "Savollar allaqachon yuklangan")
        if len(questions) != QUESTION_COUNT:
            raise AppError(400, f"Aniq {QUESTION_COUNT} ta savol kerak, {len(questions)} ta yuborildi")

        to_create = []
        for idx, q in enumerate(questions, start=1):
            text = (q.get("text") or "").strip()
            answer = (q.get("answer") or "").strip()
            if not text or not answer:
                raise AppError(400, f"#{idx}-savol yoki javob bo'sh bo'lishi mumkin emas")
            to_create.append(ZtQuestion(room=room, sector=idx, text=text, answer=answer))

        ZtQuestion.objects.bulk_create(to_create)

    return _serialize_room(room, viewer_telegram_id=admin_telegram_id)


def start_game(*, code: str, admin_telegram_id: int) -> dict[str, Any]:
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        _require_room_admin(room, admin_telegram_id)
        if room.status != "team_confirmed":
            raise AppError(409, f"Xona '{room.status}' holatda — boshlash mumkin emas")
        q_count = room.questions.count()
        if q_count != QUESTION_COUNT:
            raise AppError(409, f"{QUESTION_COUNT} ta savol yuklanmagan (hozir {q_count} ta)")
        room.status = "in_progress"
        room.started_at = timezone.now()
        room.save(update_fields=["status", "started_at"])

    return _serialize_room(room, viewer_telegram_id=admin_telegram_id)


# ─── O'yin davri: ot aylantirish → muhokama → javob → baholash ───────────────

def spin(*, code: str, admin_telegram_id: int) -> dict[str, Any]:
    """Ot tasodifiy ishlatilmagan sektorga tushadi. Savol hech qachon takrorlanmaydi."""
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        _require_room_admin(room, admin_telegram_id)
        if room.status != "in_progress":
            raise AppError(409, f"Xona '{room.status}' holatda — hozir ot aylantirib bo'lmaydi")

        unused = list(ZtQuestion.objects.select_for_update().filter(room=room, used=False))
        if not unused:
            # 12 ta savol tugadi-yu hech kim 6 ballga yetmadi — spec bu holatni
            # aniq belgilamagan. Oqilona yechim: joriy hisobga ko'ra yakunlaymiz.
            if room.team_score > room.fans_score:
                room.winner = "team"
            elif room.fans_score > room.team_score:
                room.winner = "fans"
            else:
                room.winner = "draw"
            room.status = "finished"
            room.finished_at = timezone.now()
            room.save(update_fields=["winner", "status", "finished_at"])
            result = _serialize_room(room, viewer_telegram_id=admin_telegram_id)
            result["ranOutOfQuestions"] = True
            return result

        question = secrets.choice(unused)
        question.used = True
        question.save(update_fields=["used"])

        room.current_question = question
        room.status = "discussion"
        room.discussion_deadline = timezone.now() + timedelta(seconds=DISCUSSION_SECONDS)
        room.captain_answer_text = ""
        room.captain_answer_is_voice = False
        room.save(update_fields=[
            "current_question", "status", "discussion_deadline",
            "captain_answer_text", "captain_answer_is_voice",
        ])

    result = _serialize_room(room, viewer_telegram_id=admin_telegram_id)
    result["ranOutOfQuestions"] = False
    return result


def advance_discussion_if_due(*, code: str) -> dict[str, Any]:
    """Muhokama vaqti tugagach 'discussion' → 'awaiting_answer'.

    Bot 60 soniyalik timer bilan chaqiradi. Admin egaligini talab qilmaydi
    (bot o'zi, hech kim nomidan emas, chaqiradi) — shuning uchun deadline
    o'tganini server tomonida tekshirib, vaqtidan oldin chaqirilishini
    oldini olamiz (himoya: hech kim muhokamani muddatidan oldin yakunlay
    olmaydi).
    """
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        if room.status != "discussion":
            # Idempotent: admin allaqachon boshqa yo'l bilan davom ettirgan bo'lishi mumkin
            return _serialize_room(room, viewer_telegram_id=room.admin_telegram_id)
        if not room.discussion_deadline or timezone.now() < room.discussion_deadline:
            raise AppError(409, "Muhokama vaqti hali tugamagan")
        room.status = "awaiting_answer"
        room.save(update_fields=["status"])

    return _serialize_room(room, viewer_telegram_id=room.admin_telegram_id)


def submit_captain_answer(*, code: str, telegram_id: int, answer_text: str, is_voice: bool = False) -> dict[str, Any]:
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        if room.status != "awaiting_answer":
            raise AppError(409, "Hozir yakuniy javob kutilmayapti")

        captain = room.players.filter(is_captain=True).first()
        if not captain or captain.telegram_id != telegram_id:
            raise AppError(403, "Faqat jamoa kapitani yakuniy javob bera oladi")

        room.captain_answer_text = (answer_text or "").strip()
        room.captain_answer_is_voice = bool(is_voice)
        room.status = "verifying"
        room.save(update_fields=["captain_answer_text", "captain_answer_is_voice", "status"])

    # Kapitanga (admin bo'lmagan ko'rinishda) to'g'ri javob ko'rsatilmaydi —
    # _serialize_room ichida is_admin_viewer=False bo'lgani uchun avtomatik yashiriladi.
    return _serialize_room(room, viewer_telegram_id=telegram_id)


def admin_verify(*, code: str, admin_telegram_id: int, is_correct: bool) -> dict[str, Any]:
    """Admin qo'lda baholaydi: to'g'ri → Jamoa +1, noto'g'ri → Muxlislar +1."""
    normalized = normalize_code(code)
    with transaction.atomic():
        room = ZtRoom.objects.select_for_update().filter(code=normalized).first()
        if not room:
            raise AppError(404, "Xona topilmadi")
        _require_room_admin(room, admin_telegram_id)
        if room.status != "verifying":
            raise AppError(409, "Hozir baholanadigan javob yo'q")

        correct_answer = room.current_question.answer if room.current_question else ""

        if is_correct:
            room.team_score += 1
        else:
            room.fans_score += 1

        game_over = room.team_score >= WIN_SCORE or room.fans_score >= WIN_SCORE

        room.current_question = None
        room.discussion_deadline = None
        room.captain_answer_text = ""
        room.captain_answer_is_voice = False

        if game_over:
            room.winner = "team" if room.team_score >= WIN_SCORE else "fans"
            room.status = "finished"
            room.finished_at = timezone.now()
        else:
            room.status = "in_progress"

        room.save(update_fields=[
            "team_score", "fans_score", "current_question", "discussion_deadline",
            "captain_answer_text", "captain_answer_is_voice", "winner", "status", "finished_at",
        ])

    result = _serialize_room(room, viewer_telegram_id=admin_telegram_id)
    result["isCorrect"] = is_correct
    result["correctAnswer"] = correct_answer
    result["gameOver"] = game_over
    return result
