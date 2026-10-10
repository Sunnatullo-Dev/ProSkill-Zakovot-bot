"""Users API endpointlari — eski /api/users/* yo'llari bilan bir xil."""
from __future__ import annotations

import logging

from django.core.cache import cache
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

    period = request.query_params.get("period", "all")  # "all" | "monthly"

    if period == "monthly":
        users, my_score = repositories.get_monthly_score_leaders(
            limit=limit, telegram_id=user.telegram_id
        )
        rank = repositories.get_monthly_score_rank(user.telegram_id)
        return Response({"users": users, "rank": rank, "limit": limit, "myMonthlyScore": my_score})

    users = repositories.get_top_users(limit=limit)
    rank = repositories.get_user_rank(user.telegram_id)
    return Response({"users": users, "rank": rank, "limit": limit})


@api_view(["GET"])
@require_auth
def get_referrals(request):
    user = request.current_user
    period = request.query_params.get("period", "all")  # "all" | "monthly"

    if period == "monthly":
        referrers = repositories.get_referral_leaderboard_monthly()
        my_count = repositories.get_referral_count_monthly(user.telegram_id)
    else:
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

    # Rate limit: daqiqasiga 10 marta (achievement farming oldini olish)
    rate_key = f"ach_check:{user.telegram_id}"
    calls = cache.get(rate_key, 0)
    if calls >= 10:
        raise AppError(429, "Juda ko'p so'rov, bir daqiqadan keyin urinib ko'ring")
    cache.set(rate_key, calls + 1, timeout=60)

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


@api_view(["POST"])
@require_auth
def bot_start(request):
    """Bot /start komandasida chaqiriladi — foydalanuvchini yaratadi yoki topadi.

    Body: { "telegramId": int, "firstName": str, "lastName": str?, "username": str? }
    Response: { "isNew": bool, "totalCount": int }
    """
    body = request.data if isinstance(request.data, dict) else {}

    telegram_id = body.get("telegramId")
    if not isinstance(telegram_id, int) or telegram_id <= 0:
        raise AppError(400, "telegramId kerak (musbat son)")

    first_name = body.get("firstName") or None
    last_name = body.get("lastName") or None
    username = body.get("username") or None

    from .models import User as UserModel

    _, created = UserModel.objects.get_or_create(
        telegram_id=telegram_id,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
            "username": username,
        },
    )

    total_count = UserModel.objects.count()

    return Response({
        "isNew": created,
        "totalCount": total_count,
        "hasPhone": bool(user.phone),
        "phone": user.phone,
    })


@api_view(["GET", "POST"])
@require_auth
def bot_phone_status(request):
    """Foydalanuvchining telefon raqami tasdiqlanganmi-yo'qligini tekshiradi."""
    tid = request.query_params.get("telegramId")
    if not tid and isinstance(request.data, dict):
        tid = request.data.get("telegramId")
    if not tid and getattr(request, "current_user", None) and request.current_user.telegram_id > 0:
        tid = request.current_user.telegram_id

    if not tid:
        raise AppError(400, "telegramId talab qilinadi")

    try:
        telegram_id = int(tid)
    except (TypeError, ValueError):
        raise AppError(400, "telegramId musbat son bo'lishi kerak")

    from .models import User as UserModel

    user = UserModel.objects.filter(telegram_id=telegram_id).first()
    return Response({
        "telegramId": telegram_id,
        "hasPhone": bool(user and user.phone),
        "phone": user.phone if user else None,
    })


@api_view(["POST"])
@require_auth
def bot_save_phone(request):
    """Telegram bot orqali kontakt ulashilganda telefon raqamini saqlaydi va akkauntlarni birlashtiradi."""
    body = request.data if isinstance(request.data, dict) else {}
    telegram_id = body.get("telegramId")
    phone_raw = body.get("phone")

    if not isinstance(telegram_id, int) or telegram_id <= 0:
        raise AppError(400, "telegramId musbat son bo'lishi kerak")
    if not isinstance(phone_raw, str) or not phone_raw.strip():
        raise AppError(400, "phone talab qilinadi")

    from apps.auth_api.credentials import normalize_phone
    phone = normalize_phone(phone_raw)

    first_name = body.get("firstName") or None
    last_name = body.get("lastName") or None
    username = body.get("username") or None

    from django.db import transaction
    from apps.auth_api.services import _migrate_user_records
    from .models import AUTH_PROVIDER_BOTH, User as UserModel

    with transaction.atomic():
        tg_user, _ = UserModel.objects.select_for_update().get_or_create(
            telegram_id=telegram_id,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "username": username,
                "display_name": first_name,
            },
        )

        existing_phone_user = (
            UserModel.objects.select_for_update()
            .filter(phone=phone)
            .exclude(pk=tg_user.pk)
            .first()
        )

        if existing_phone_user:
            if existing_phone_user.is_app_account():
                old_synthetic_id = existing_phone_user.telegram_id
                tg_user.score += existing_phone_user.score
                if not tg_user.password_hash and existing_phone_user.password_hash:
                    tg_user.password_hash = existing_phone_user.password_hash
                if not tg_user.email and existing_phone_user.email:
                    tg_user.email = existing_phone_user.email

                existing_achs = (
                    existing_phone_user.unlocked_achievements
                    if isinstance(existing_phone_user.unlocked_achievements, list)
                    else []
                )
                tg_achs = (
                    tg_user.unlocked_achievements
                    if isinstance(tg_user.unlocked_achievements, list)
                    else []
                )
                tg_user.unlocked_achievements = list(dict.fromkeys(tg_achs + existing_achs))
                tg_user.current_streak = max(
                    tg_user.current_streak, existing_phone_user.current_streak
                )

                if existing_phone_user.premium_until and (
                    not tg_user.premium_until
                    or existing_phone_user.premium_until > tg_user.premium_until
                ):
                    tg_user.premium_until = existing_phone_user.premium_until

                existing_phone_user.delete()
                _migrate_user_records(old_synthetic_id, telegram_id)
            else:
                existing_phone_user.phone = None
                existing_phone_user.save(update_fields=["phone", "updated_at"])

        tg_user.phone = phone
        if tg_user.has_usable_password():
            tg_user.auth_provider = AUTH_PROVIDER_BOTH
        if first_name and not tg_user.first_name:
            tg_user.first_name = first_name
        if last_name and not tg_user.last_name:
            tg_user.last_name = last_name
        if username and not tg_user.username:
            tg_user.username = username
        tg_user.save()

    return Response({
        "ok": True,
        "telegramId": tg_user.telegram_id,
        "phone": tg_user.phone,
        "score": tg_user.score,
    })


def _parse_int(raw: str | None, *, default: int, lo: int, hi: int) -> int:
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise AppError(400, "Noto'g'ri raqam")
    return max(lo, min(hi, value))
