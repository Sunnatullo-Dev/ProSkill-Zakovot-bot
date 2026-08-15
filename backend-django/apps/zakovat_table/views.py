"""Interaktiv Zakovat Stoli — REST endpoint'lari.

O'yin boshqaruvi (jamoa, savollar, spin, baholash va h.k.) faqat bot orqali
amalga oshiriladi — bu amallar `@require_bot_auth` bilan himoyalangan va
FAQAT `Authorization: bot <BOT_INTERNAL_API_KEY>` + `X-On-Behalf-Of`
sarlavhalari bilan kelgan so'rovlarni qabul qiladi
(apps.core.middleware.TelegramAuthMiddleware + apps.core.decorators).

Yagona istisno — `get_state` (o'qish uchun, xona holatini olish): u
mini-app'dagi "kuzatuvchi" (spectator) ekrani uchun `Authorization: tma
<initData>` orqali ham chaqiriladi (`@require_auth` — ikkala auth turini
ham qabul qiladi). tma orqali kelgan so'rovlarda admin-only maydonlar
(to'g'ri javob, kapitan javobi) hech qachon qaytarilmaydi — qarang
repositories.get_room_state(allow_admin_fields=...).

Javob shakllari camelCase (loyihaning umumiy konvensiyasiga mos).
"""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth, require_bot_auth
from apps.core.exceptions import AppError

from . import repositories


# ─── Xona yaratish va ro'yxat ─────────────────────────────────────────────────

@api_view(["POST"])
@require_bot_auth
def create_room(request):
    """Yangi xona yaratish.

    POST /api/zakovat-table/rooms
    Auth: require_bot_auth (faqat bot; admin ekanligi bot tomonidan tekshiriladi)
    """
    user = request.current_user
    result = repositories.create_room(admin_telegram_id=user.telegram_id)
    return Response(result, status=201)


@api_view(["GET"])
@require_bot_auth
def admin_rooms(request):
    """Adminning oxirgi xonalari ro'yxati.

    GET /api/zakovat-table/admin/rooms
    """
    user = request.current_user
    result = repositories.list_admin_rooms(admin_telegram_id=user.telegram_id)
    return Response(result)


# ─── Holat ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def get_state(request, code: str):
    """Xona holati.

    GET /api/zakovat-table/rooms/<code>/state
    Auth: require_auth — botdan (`bot <KEY>`) yoki mini-app'dan (`tma <initData>`,
    kuzatuvchi ekrani) kelishi mumkin. tma bilan kelgan so'rovda admin-only
    maydonlar (to'g'ri javob, kapitan javobi) hech qachon qaytarilmaydi.
    """
    user = request.current_user
    is_bot_auth = getattr(request, "auth_source", None) == "bot"
    result = repositories.get_room_state(
        code, viewer_telegram_id=user.telegram_id, allow_admin_fields=is_bot_auth,
    )
    return Response(result)


# ─── Qo'shilish ────────────────────────────────────────────────────────────────

@api_view(["POST"])
@require_bot_auth
def join_player(request, code: str):
    """O'yinchi sifatida qo'shilish (birinchi 6 kishi, 1-si kapitan).

    POST /api/zakovat-table/rooms/<code>/join
    Body: { displayName: str }
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    display_name = (body.get("displayName") or "").strip()
    result = repositories.join_player(
        code=code, telegram_id=user.telegram_id, display_name=display_name,
    )
    return Response(result)


@api_view(["POST"])
@require_bot_auth
def join_spectator(request, code: str):
    """Muxlis sifatida kuzatish uchun qo'shilish (o'qishga huquqli, holatga ta'sir qilmaydi).

    POST /api/zakovat-table/rooms/<code>/spectate
    """
    user = request.current_user
    result = repositories.join_spectator(code=code, telegram_id=user.telegram_id)
    return Response(result)


# ─── Admin: jamoa va o'yin boshqaruvi ─────────────────────────────────────────

@api_view(["POST"])
@require_bot_auth
def confirm_team(request, code: str):
    """Jamoani tasdiqlash (6/6).

    POST /api/zakovat-table/admin/rooms/<code>/confirm-team
    """
    user = request.current_user
    result = repositories.confirm_team(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


@api_view(["POST"])
@require_bot_auth
def upload_questions(request, code: str):
    """Roppa-rosa 12 ta savol yuklash.

    POST /api/zakovat-table/admin/rooms/<code>/questions
    Body: { questions: [ { text: str, answer: str }, ... ] }  (aniq 12 ta)
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    questions = body.get("questions")
    if not isinstance(questions, list):
        raise AppError(400, "questions ro'yxat bo'lishi kerak")
    result = repositories.upload_questions(
        code=code, admin_telegram_id=user.telegram_id, questions=questions,
    )
    return Response(result, status=201)


@api_view(["POST"])
@require_bot_auth
def start_game(request, code: str):
    """O'yinni boshlash.

    POST /api/zakovat-table/admin/rooms/<code>/start
    """
    user = request.current_user
    result = repositories.start_game(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


@api_view(["POST"])
@require_bot_auth
def spin(request, code: str):
    """Otni aylantirish — tasodifiy ishlatilmagan sektor tanlanadi.

    POST /api/zakovat-table/admin/rooms/<code>/spin
    """
    user = request.current_user
    result = repositories.spin(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


@api_view(["POST"])
@require_bot_auth
def advance_discussion(request, code: str):
    """Muhokama vaqti tugagach kapitandan javob so'rash bosqichiga o'tish.

    POST /api/zakovat-table/rooms/<code>/advance-discussion
    Auth: require_bot_auth (bot o'z 60s timeri bilan chaqiradi — deadline
    server tomonida tekshiriladi, muddatidan oldin chaqirib bo'lmaydi)
    """
    result = repositories.advance_discussion_if_due(code=code)
    return Response(result)


@api_view(["POST"])
@require_bot_auth
def submit_captain_answer(request, code: str):
    """Kapitanning yakuniy javobi (matn yoki ovozli xabar relay qilingandan keyin).

    POST /api/zakovat-table/rooms/<code>/answer
    Body: { answer: str, isVoice?: bool }
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    answer_text = body.get("answer") if isinstance(body.get("answer"), str) else ""
    is_voice = bool(body.get("isVoice", False))
    result = repositories.submit_captain_answer(
        code=code, telegram_id=user.telegram_id, answer_text=answer_text, is_voice=is_voice,
    )
    return Response(result)


@api_view(["POST"])
@require_bot_auth
def admin_verify(request, code: str):
    """Admin qo'lda baholaydi: to'g'ri (Jamoa +1) yoki noto'g'ri (Muxlislar +1).

    POST /api/zakovat-table/admin/rooms/<code>/verify
    Body: { isCorrect: bool }
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    is_correct_raw = body.get("isCorrect")
    if is_correct_raw is None:
        raise AppError(400, "isCorrect (true/false) yuborilishi kerak")
    result = repositories.admin_verify(
        code=code, admin_telegram_id=user.telegram_id, is_correct=bool(is_correct_raw),
    )
    return Response(result)
