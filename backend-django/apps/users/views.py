"""Users API endpointlari — eski /api/users/* yo'llari bilan bir xil."""
from __future__ import annotations

import logging

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError
from apps.game_results.repositories import get_stats as get_game_stats

from . import repositories
from .achievements import find_newly_unlocked


logger = logging.getLogger(__name__)

# Frontend i18n bilan mos kelishi shart — qiymatlar shu yerda
# bog'lab qo'yilgan (single source of truth).
SUPPORTED_LANGUAGES = {"uz-latn", "uz-cyrl", "ru"}


@api_view(["GET"])
@require_auth
def get_top(request):
    limit = _parse_int(request.query_params.get("limit"), default=3, lo=1, hi=100)
    users = repositories.get_top_users(limit=limit)
    return Response({"users": users})


@api_view(["GET"])
@require_auth
def get_leaderboard(request):
    user = request.current_user
    # ?limit=10|20|50|100 — standart 10, maksimum 100
    ALLOWED = {10, 20, 50, 100}
    try:
        limit = int(request.query_params.get("limit", 10))
    except (TypeError, ValueError):
        limit = 10
    if limit not in ALLOWED:
        limit = 10
    users = repositories.get_top_users(limit=limit)
    rank = repositories.get_user_rank(user.telegram_id)
    return Response({"users": users, "rank": rank, "limit": limit})


@api_view(["GET"])
@require_auth
def get_referrals(request):
    user = request.current_user
    referrers = repositories.get_referral_leaderboard()
    my_count = repositories.get_referral_count(user.telegram_id)
    return Response({"referrers": referrers, "myCount": my_count})


@api_view(["PATCH"])
@require_auth
def update_me(request):
    """Faqat display_name'ni yangilaymiz — qolgan maydonlar Telegram'dan."""
    user = request.current_user

    # Mehmon foydalanuvchi (telegram_id=0) bitta DB qatorida bo'ladi — uning
    # nomini DB'ga yozsak, hamma mehmon shu nomni ko'radi. Frontend
    # localStorage'ga saqlasin, backend rad etadi.
    if user.telegram_id <= 0:
        raise AppError(403, "Mehmon foydalanuvchining ismi DB'ga saqlanmaydi")

    body = request.data if isinstance(request.data, dict) else {}

    if "displayName" not in body:
        raise AppError(400, "displayName kerak")

    raw = body.get("displayName")
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        # Bo'sh kiritsa — null ga qaytaramiz, Telegram first_name'iga qaytadi.
        display_name = None
    elif isinstance(raw, str):
        trimmed = raw.strip()
        if len(trimmed) > 30:
            raise AppError(400, "Ism 30 belgidan oshmasin")
        display_name = trimmed
    else:
        raise AppError(400, "displayName matn bo'lishi kerak")

    updated = repositories.update_display_name(user.telegram_id, display_name)
    return Response({"user": updated})


@api_view(["PATCH"])
@require_auth
def update_language(request):
    """Foydalanuvchining UI tilini saqlaydi.

    Body: {"language": "uz-latn" | "uz-cyrl" | "ru"}
    """
    user = request.current_user

    # Mehmon yozuvi (telegram_id=0) — barcha mehmonlar bilan bo'linadi, shuning
    # uchun unga til yozsak hamma mehmonga ta'sir qiladi. Frontend
    # localStorage'ni ishlatsin.
    if user.telegram_id <= 0:
        # 200 OK qaytaramiz (frontend xato deb hisoblamasin), lekin DB'ga yozmaymiz.
        return Response({"ok": True, "language": None, "stored": False})

    body = request.data if isinstance(request.data, dict) else {}
    raw = body.get("language")
    if not isinstance(raw, str) or raw not in SUPPORTED_LANGUAGES:
        raise AppError(400, "Til kodi noto'g'ri")

    repositories.update_language(user.telegram_id, raw)
    logger.info(
        "user_language_changed",
        extra={"event": "user_language_changed", "by": user.telegram_id, "lang": raw},
    )
    return Response({"ok": True, "language": raw, "stored": True})


@api_view(["POST"])
@require_auth
def check_achievements(request):
    """Yutuqlarni hisoblab, yangilarini topadi, bonus ball beradi."""
    user = request.current_user
    stats = get_game_stats(user.telegram_id)

    current = repositories.find_by_telegram_id(user.telegram_id)
    if not current:
        raise AppError(404, "Foydalanuvchi topilmadi")

    stats_with_score = dict(stats)
    stats_with_score["totalScore"] = current["score"]

    already = repositories.get_unlocked_achievements(user.telegram_id)
    newly = find_newly_unlocked(stats_with_score, already)

    if not newly:
        return Response({"newlyUnlocked": [], "user": current})

    total_bonus = sum(a.bonus for a in newly)
    if total_bonus > 0:
        updated_user = repositories.add_score(user.telegram_id, total_bonus)
    else:
        updated_user = current

    new_ids = [a.id for a in newly]
    repositories.set_unlocked_achievements(user.telegram_id, [*already, *new_ids])

    return Response(
        {
            "newlyUnlocked": [
                {"id": a.id, "label": a.label, "bonus": a.bonus} for a in newly
            ],
            "totalBonus": total_bonus,
            "user": updated_user,
        }
    )


def _parse_int(raw: str | None, *, default: int, lo: int, hi: int) -> int:
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise AppError(400, "Noto'g'ri raqam")
    return max(lo, min(hi, value))
