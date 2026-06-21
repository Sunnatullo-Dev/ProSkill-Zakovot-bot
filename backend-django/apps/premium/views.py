"""Premium API endpoint'lari.

Admin endpoint'lari: /api/admin/premium/*  — require_admin
Public endpoint:    /api/premium/info       — require_auth
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin, require_auth
from apps.core.exceptions import AppError
from apps.users import repositories as user_repo
from apps.users.models import PremiumSettings, User

from .limits import VALID_SECTIONS, get_usage


logger = logging.getLogger(__name__)


# ── Yordamchi funksiyalar ─────────────────────────────────────────────────────

def _validate_section_limits(raw) -> dict:
    """section_limits PATCH body'dan validatsiya qiladi.

    Kutilayotgan format:
        {
          "round":    { "limited": bool, "free_limit": int },
          "daily":    { "limited": bool, "free_limit": int },
          ...
        }
    Noma'lum bo'limlar e'tiborga olinmaydi.
    """
    if not isinstance(raw, dict):
        raise AppError(400, "sectionLimits dict bo'lishi kerak")
    cleaned = {}
    for section in VALID_SECTIONS:
        if section not in raw:
            continue
        cfg = raw[section]
        if not isinstance(cfg, dict):
            raise AppError(400, f"sectionLimits.{section} dict bo'lishi kerak")
        limited = cfg.get("limited")
        if not isinstance(limited, bool):
            raise AppError(400, f"sectionLimits.{section}.limited boolean bo'lishi kerak")
        free_limit_raw = cfg.get("free_limit", 0)
        try:
            free_limit = int(free_limit_raw)
        except (TypeError, ValueError):
            raise AppError(400, f"sectionLimits.{section}.free_limit raqam bo'lishi kerak")
        if free_limit < 0:
            raise AppError(400, f"sectionLimits.{section}.free_limit manfiy bo'lmasin")
        cleaned[section] = {"limited": limited, "free_limit": free_limit}
    return cleaned


def _premium_user_dict(user: User) -> dict:
    """Foydalanuvchi premium holatini dict'ga aylantiradi."""
    return {
        "isPremium": user.is_premium_active(),
        "premiumUntil": user.premium_until.isoformat() if user.premium_until else None,
    }


# ── Admin: settings ──────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@require_admin
def admin_premium_settings(request):
    """Premium global sozlamalarini olish yoki yangilash.

    GET  /api/admin/premium/settings
    PATCH /api/admin/premium/settings
    Body (PATCH, barchasi ixtiyoriy):
      {
        "enabled": bool,
        "price": int,
        "currency": str,
        "durationDays": int,
        "benefits": str,
        "sectionLimits": { "round": { "limited": bool, "free_limit": int }, ... }
      }
    """
    if request.method == "GET":
        obj = PremiumSettings.get()
        return Response(obj.to_dict())

    # PATCH
    body = request.data if isinstance(request.data, dict) else {}
    obj, _ = PremiumSettings.objects.get_or_create(id=1)
    updated_fields = []

    if "enabled" in body:
        val = body["enabled"]
        if not isinstance(val, bool):
            raise AppError(400, "enabled boolean bo'lishi kerak")
        obj.enabled = val
        updated_fields.append("enabled")

    if "price" in body:
        try:
            price = int(body["price"])
        except (TypeError, ValueError):
            raise AppError(400, "price raqam bo'lishi kerak")
        if price < 0:
            raise AppError(400, "price manfiy bo'lmasin")
        obj.price = price
        updated_fields.append("price")

    if "currency" in body:
        currency = (body["currency"] or "").strip()
        if not currency:
            raise AppError(400, "currency bo'sh bo'lmasin")
        if len(currency) > 20:
            raise AppError(400, "currency 20 belgidan oshmasin")
        obj.currency = currency
        updated_fields.append("currency")

    if "durationDays" in body:
        try:
            days = int(body["durationDays"])
        except (TypeError, ValueError):
            raise AppError(400, "durationDays raqam bo'lishi kerak")
        if not (1 <= days <= 3650):
            raise AppError(400, "durationDays 1-3650 kun oralig'ida bo'lishi kerak")
        obj.duration_days = days
        updated_fields.append("duration_days")

    if "benefits" in body:
        benefits = body["benefits"] if isinstance(body["benefits"], str) else ""
        obj.benefits = benefits.strip()
        updated_fields.append("benefits")

    if "sectionLimits" in body:
        new_limits = _validate_section_limits(body["sectionLimits"])
        # Mavjud limitlarni yangilaymiz (PATCH — faqat yuborilgan bo'limlar o'zgaradi)
        existing = obj.section_limits if isinstance(obj.section_limits, dict) else {}
        existing.update(new_limits)
        obj.section_limits = existing
        updated_fields.append("section_limits")

    if updated_fields:
        obj.save(update_fields=updated_fields + ["updated_at"])
        PremiumSettings.invalidate_cache()
        logger.info(
            "premium_settings_updated",
            extra={
                "event": "premium_settings_updated",
                "fields": updated_fields,
                "by": getattr(request.current_user, "telegram_id", 0),
            },
        )

    return Response(PremiumSettings.get().to_dict())


# ── Admin: foydalanuvchiga premium berish/olish ───────────────────────────────

@api_view(["POST"])
@require_admin
def admin_grant_premium(request, telegram_id: int):
    """Foydalanuvchiga premium berish yoki uzaytirish.

    POST /api/admin/users/<telegram_id>/premium
    Body (ixtiyoriy): { "durationDays": int }
    Response: { ok: true, telegramId, premiumUntil, durationDays }

    Agar allaqachon premium aktiv bo'lsa — premium_until'dan uzaytiradi.
    """
    user = User.objects.filter(telegram_id=telegram_id).first()
    if not user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    body = request.data if isinstance(request.data, dict) else {}
    duration_days_raw = body.get("durationDays")

    if duration_days_raw is not None:
        try:
            duration_days = int(duration_days_raw)
        except (TypeError, ValueError):
            raise AppError(400, "durationDays raqam bo'lishi kerak")
        if not (1 <= duration_days <= 3650):
            raise AppError(400, "durationDays 1-3650 kun oralig'ida bo'lishi kerak")
    else:
        # Default: PremiumSettings'dan olamiz
        settings = PremiumSettings.get()
        duration_days = settings.duration_days

    now = timezone.now()
    # Hozirda aktiv premium bo'lsa — undan uzaytirish, aks holda hozirdan
    base = user.premium_until if (user.premium_until and user.premium_until > now) else now
    new_until = base + timedelta(days=duration_days)

    User.objects.filter(telegram_id=telegram_id).update(premium_until=new_until)

    by = getattr(request.current_user, "telegram_id", 0)
    logger.info(
        "premium_granted",
        extra={
            "event": "premium_granted",
            "to": telegram_id,
            "by": by,
            "days": duration_days,
            "until": new_until.isoformat(),
        },
    )

    return Response({
        "ok": True,
        "telegramId": telegram_id,
        "premiumUntil": new_until.isoformat(),
        "durationDays": duration_days,
    })


@api_view(["DELETE"])
@require_admin
def admin_revoke_premium(request, telegram_id: int):
    """Foydalanuvchidan premiumni olish (premium_until = null).

    DELETE /api/admin/users/<telegram_id>/premium
    Response: { ok: true, telegramId }
    """
    user = User.objects.filter(telegram_id=telegram_id).first()
    if not user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    User.objects.filter(telegram_id=telegram_id).update(premium_until=None)

    by = getattr(request.current_user, "telegram_id", 0)
    logger.info(
        "premium_revoked",
        extra={"event": "premium_revoked", "from": telegram_id, "by": by},
    )

    return Response({"ok": True, "telegramId": telegram_id})


# ── Admin: premium foydalanuvchilar ro'yxati ─────────────────────────────────

@api_view(["GET"])
@require_admin
def admin_premium_users(request):
    """Hozirda aktiv premium foydalanuvchilar ro'yxati.

    GET /api/admin/premium/users
    Response: { items: [...], total: int }
    """
    from django.utils import timezone as tz
    qs = User.objects.filter(premium_until__gt=tz.now()).order_by("premium_until")
    items = [
        {
            "telegramId": u.telegram_id,
            "firstName": u.first_name,
            "username": u.username,
            "premiumUntil": u.premium_until.isoformat(),
        }
        for u in qs
    ]
    return Response({"items": items, "total": len(items)})


# ── Public: premium so'rovi (foydalanuvchi → adminlarga xabar) ───────────────

_PREMIUM_REQUEST_CACHE_TTL = 6 * 60 * 60  # 6 soat


@api_view(["POST"])
@require_auth
def premium_request(request):
    """Foydalanuvchi premium sotib olmoqchi — barcha adminlarga xabar yuborish.

    POST /api/premium/request
    Auth: require_auth
    Body: {} (bo'sh)
    Response: { ok: true }

    Anti-spam: har bir foydalanuvchi 6 soatda bir marta adminlarga xabar yuboradi.
    Takroriy so'rovlar { ok: true } qaytaradi, lekin adminlarga yuborilmaydi.
    """
    from django.core.cache import cache
    from apps.core.telegram_notifier import send_message_sync
    from apps.users.repositories import _get_all_admin_telegram_ids

    user = request.current_user
    telegram_id: int = user.telegram_id

    cache_key = f"premium_request:{telegram_id}"

    # Anti-spam: agar so'rov allaqachon yuborilgan bo'lsa — qaytib kel
    if cache.get(cache_key):
        logger.info("premium_request:throttled telegram_id=%s", telegram_id)
        return Response({"ok": True})

    # Cache'ga qo'yib, keyingi 6 soat uchun bloklaymiz
    cache.set(cache_key, 1, timeout=_PREMIUM_REQUEST_CACHE_TTL)

    # Foydalanuvchi ma'lumotlari
    first_name = (user.first_name or "").strip()
    last_name = (user.last_name or "").strip()
    name = f"{first_name} {last_name}".strip() or "Noma'lum"
    username = user.username

    if username:
        user_mention = f"@{username}"
    else:
        user_mention = f"ID: {telegram_id}"

    text = (
        f"⭐ <b>Yangi Premium soʿrovi!</b>\n\n"
        f"\U0001F464 {name} ({user_mention})\n"
        f"\U0001F194 {telegram_id}\n\n"
        f"Foydalanuvchi Premium sotib olmoqchi. "
        f"Admin panel → Foydalanuvchilar → shu foydalanuvchini topib "
        f"⭐ Premium berish bosing."
    )

    admin_ids = _get_all_admin_telegram_ids()
    if not admin_ids:
        logger.warning("premium_request: adminlar yo'q, xabar yuborilmadi")
    else:
        for admin_id in admin_ids:
            try:
                send_message_sync(admin_id, text, with_mini_app_button=False)
            except Exception:
                logger.warning(
                    "premium_request: admin %s ga xabar yuborishda xato",
                    admin_id,
                    exc_info=True,
                )
        logger.info(
            "premium_request:sent telegram_id=%s admins=%d",
            telegram_id,
            len(admin_ids),
        )

    return Response({"ok": True})


# ── Public: premium info (foydalanuvchi uchun) ────────────────────────────────

@api_view(["GET"])
@require_auth
def premium_info(request):
    """Joriy foydalanuvchi uchun premium holati va sozlamalar.

    GET /api/premium/info
    Response:
    {
      enabled, price, currency, durationDays, benefits, sections,
      isPremium, premiumUntil,
      usage: { round: { used, limit, remaining, limited }, ... }
    }
    """
    user = request.current_user
    settings = PremiumSettings.get()
    usage = get_usage(user)

    data = settings.to_dict()
    data["isPremium"] = user.is_premium_active()
    data["premiumUntil"] = user.premium_until.isoformat() if user.premium_until else None
    data["usage"] = usage
    return Response(data)
