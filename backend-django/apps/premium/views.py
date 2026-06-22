"""Premium API endpoint'lari.

Admin endpoint'lari : /api/admin/premium/*  — require_admin
Public endpoint'lari: /api/premium/*         — require_auth
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings as django_settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.decorators import require_admin, require_auth
from apps.core.exceptions import AppError
from apps.users import repositories as user_repo
from apps.users.models import PremiumSettings, User

from .limits import VALID_SECTIONS, get_usage
from .models import PremiumRequest


logger = logging.getLogger(__name__)


# ── Yordamchi funksiyalar ─────────────────────────────────────────────────────

def _validate_section_limits(raw) -> dict:
    """section_limits PATCH body'dan validatsiya qiladi."""
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


def _admin_display_name(admin_user) -> str:
    """Admin uchun ko'rinadigan ism hosil qiladi."""
    first = (getattr(admin_user, "first_name", "") or "").strip()
    last = (getattr(admin_user, "last_name", "") or "").strip()
    name = f"{first} {last}".strip()
    return name or f"Admin {admin_user.telegram_id}"


def _get_storage_chat(poster_telegram_id: int):
    """Media saqlash uchun Telegram chat ID — admin_board bilan bir xil mantig'."""
    chat_id = getattr(django_settings, "ADMIN_MEDIA_CHAT_ID", "")
    if chat_id:
        try:
            return int(chat_id)
        except (ValueError, TypeError):
            return str(chat_id)
    return poster_telegram_id


# ── Media relay + proxy — admin_board.views dan qayta ishlatilgan ────────────

def _relay_receipt_to_telegram(
    *,
    file_bytes: bytes,
    file_name: str,
    content_type: str,
    chat_id,
    bot_token: str,
) -> str:
    """Rasm chekini Telegram'ga yuborib file_id qaytaradi (sendPhoto)."""
    import json
    import urllib.request

    boundary = "----ZakovatReceiptBoundary9x2k"

    def _field(name: str, value: str) -> bytes:
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode("utf-8")

    def _file_part(name: str, fname: str, ctype: str, data: bytes) -> bytes:
        header = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"; filename="{fname}"\r\n'
            f"Content-Type: {ctype}\r\n\r\n"
        ).encode("utf-8")
        return header + data + b"\r\n"

    body = (
        _field("chat_id", str(chat_id))
        + _file_part("photo", file_name, content_type, file_bytes)
        + f"--{boundary}--\r\n".encode("utf-8")
    )

    url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            data = json.loads(resp.read().decode())
    except Exception as exc:
        logger.warning("Telegram sendPhoto (receipt) xatosi: %s", exc)
        raise AppError(502, "Chekni Telegramga yuborishda xato yuz berdi")

    if not data.get("ok"):
        desc = data.get("description", "Noma'lum xato")
        logger.warning("Telegram API receipt rad etdi: %s", desc)
        raise AppError(502, f"Telegram chekni qabul qilmadi: {desc}")

    photos = data.get("result", {}).get("photo", [])
    if not photos:
        raise AppError(502, "Telegram rasm file_id qaytarmadi")
    return photos[-1]["file_id"]


def _proxy_receipt_from_telegram(file_id: str, bot_token: str) -> tuple[bytes, str]:
    """Telegram'dan file_id orqali fayl olib qaytaradi — admin_board bilan bir xil."""
    import json
    import urllib.request

    _MAX_BYTES = 15 * 1024 * 1024  # 15 MB

    get_file_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"
    try:
        with urllib.request.urlopen(get_file_url, timeout=10) as resp:  # noqa: S310
            data = json.loads(resp.read().decode())
    except Exception as exc:
        logger.warning("Telegram getFile (receipt) xatosi: %s", exc)
        raise AppError(502, "Telegram chek manzilini olishda xato")

    if not data.get("ok"):
        raise AppError(404, "Telegram chek topilmadi (file_id eskirgan yoki noto'g'ri)")

    file_path = data.get("result", {}).get("file_path", "")
    if not file_path:
        raise AppError(502, "Telegram file_path bo'sh qaytdi")

    download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
    try:
        with urllib.request.urlopen(download_url, timeout=30) as resp:  # noqa: S310
            cl = resp.headers.get("Content-Length")
            if cl is not None and int(cl) > _MAX_BYTES:
                raise AppError(413, "Chek fayli juda katta")
            content = resp.read(_MAX_BYTES + 1)
            if len(content) > _MAX_BYTES:
                raise AppError(413, "Chek fayli juda katta")
            content_type = resp.headers.get("Content-Type", "image/jpeg")
    except AppError:
        raise
    except Exception as exc:
        logger.warning("Telegram chek yuklab olishda xato: %s", exc)
        raise AppError(502, "Telegram chekni yuklab olishda xato")

    return content, content_type


# ── Admin: sozlamalar ─────────────────────────────────────────────────────────

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
        "paymentDetails": str,
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

    if "cardNumber" in body:
        cn = body["cardNumber"] if isinstance(body["cardNumber"], str) else ""
        obj.card_number = cn.strip()
        updated_fields.append("card_number")

    if "cardHolder" in body:
        ch = body["cardHolder"] if isinstance(body["cardHolder"], str) else ""
        obj.card_holder = ch.strip()
        updated_fields.append("card_holder")

    if "paymentDetails" in body:
        pd = body["paymentDetails"] if isinstance(body["paymentDetails"], str) else ""
        obj.payment_details = pd.strip()
        updated_fields.append("payment_details")

    if "sectionLimits" in body:
        new_limits = _validate_section_limits(body["sectionLimits"])
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


# ── Admin: foydalanuvchiga premium berish/olish (qo'lda) ─────────────────────

@api_view(["POST"])
@require_admin
def admin_grant_premium(request, telegram_id: int):
    """Foydalanuvchiga premium berish yoki uzaytirish (admin qo'lda).

    POST /api/admin/users/<telegram_id>/premium
    Body (ixtiyoriy): { "durationDays": int }
    Response: { ok: true, telegramId, premiumUntil, durationDays }
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
        settings = PremiumSettings.get()
        duration_days = settings.duration_days

    now = timezone.now()
    base = user.premium_until if (user.premium_until and user.premium_until > now) else now
    new_until = base + timedelta(days=duration_days)

    admin_user = request.current_user
    admin_name = _admin_display_name(admin_user)

    User.objects.filter(telegram_id=telegram_id).update(
        premium_until=new_until,
        premium_granted_by_telegram_id=admin_user.telegram_id,
        premium_granted_by_name=admin_name,
        premium_granted_at=now,
    )

    by = admin_user.telegram_id
    logger.info(
        "premium_granted_manual",
        extra={
            "event": "premium_granted_manual",
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

    User.objects.filter(telegram_id=telegram_id).update(
        premium_until=None,
        premium_granted_by_telegram_id=None,
        premium_granted_by_name=None,
        premium_granted_at=None,
    )

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
    """Hozirda aktiv premium foydalanuvchilar ro'yxati (kim bergan bilan).

    GET /api/admin/premium/users   (alias: /api/admin/premium/holders)
    Response: { items: [...], total: int }
    """
    qs = User.objects.filter(premium_until__gt=timezone.now()).order_by("premium_until")
    items = [
        {
            "telegramId": u.telegram_id,
            "firstName": u.first_name,
            "username": u.username,
            "premiumUntil": u.premium_until.isoformat(),
            "grantedAt": u.premium_granted_at.isoformat() if u.premium_granted_at else None,
            "grantedByName": u.premium_granted_by_name,
            "grantedByTelegramId": u.premium_granted_by_telegram_id,
        }
        for u in qs
    ]
    return Response({"items": items, "total": len(items)})


# ── Admin: to'lov so'rovlari ro'yxati ────────────────────────────────────────

@api_view(["GET"])
@require_admin
def admin_premium_requests(request):
    """Premium so'rovlar ro'yxati.

    GET /api/admin/premium/requests?status=pending|approved|rejected&page=&limit=
    Response: { items: [...], total: int, page: int, limit: int }
    """
    DEFAULT_LIMIT = 20
    MAX_LIMIT = 50

    status_filter = (request.query_params.get("status") or "").strip()
    valid_statuses = {PremiumRequest.STATUS_PENDING, PremiumRequest.STATUS_APPROVED, PremiumRequest.STATUS_REJECTED}
    if status_filter and status_filter not in valid_statuses:
        raise AppError(400, "status 'pending' | 'approved' | 'rejected' bo'lishi kerak")

    try:
        page = max(1, int(request.query_params.get("page") or 1))
    except (TypeError, ValueError):
        raise AppError(400, "page noto'g'ri")
    try:
        limit = max(1, min(MAX_LIMIT, int(request.query_params.get("limit") or DEFAULT_LIMIT)))
    except (TypeError, ValueError):
        raise AppError(400, "limit noto'g'ri")

    qs = PremiumRequest.objects.all()
    if status_filter:
        qs = qs.filter(status=status_filter)

    total = qs.count()
    offset = (page - 1) * limit
    items = [req.to_dict() for req in qs[offset: offset + limit]]

    return Response({"items": items, "total": total, "page": page, "limit": limit})


# ── Admin: chek rasmini ko'rish (media proxy) ────────────────────────────────

@api_view(["GET"])
@require_admin
def admin_receipt_proxy(request, request_id: int):
    """Chek rasmi — Telegram proxy orqali.

    GET /api/admin/premium/requests/<id>/receipt
    """
    bot_token = getattr(django_settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise AppError(502, "Bot token sozlanmagan")

    pr = PremiumRequest.objects.filter(pk=request_id).first()
    if not pr:
        raise AppError(404, "So'rov topilmadi")
    if not pr.receipt_file_id:
        raise AppError(404, "Bu so'rovda chek yo'q")

    content, content_type = _proxy_receipt_from_telegram(pr.receipt_file_id, bot_token)
    response = HttpResponse(content, content_type=content_type)
    response["Cache-Control"] = "private, max-age=3600"
    return response


# ── Admin: so'rovni tasdiqlash ────────────────────────────────────────────────

@api_view(["POST"])
@require_admin
def admin_approve_request(request, request_id: int):
    """Premium so'rovni tasdiqlash va foydalanuvchiga premium berish.

    POST /api/admin/premium/requests/<id>/approve
    Body (ixtiyoriy): { "durationDays": int }
    Response: so'rov dict'i (yangilangan)

    Idempotent: allaqachon tasdiqlangan bo'lsa double-grant qilmaydi.
    """
    from django.db import transaction
    from apps.core.telegram_notifier import send_message_sync
    from apps.users.repositories import _get_all_admin_telegram_ids

    pr = PremiumRequest.objects.filter(pk=request_id).first()
    if not pr:
        raise AppError(404, "So'rov topilmadi")

    if pr.status == PremiumRequest.STATUS_APPROVED:
        # Idempotent — ikki marta bermaslik
        return Response(pr.to_dict())

    if pr.status == PremiumRequest.STATUS_REJECTED:
        raise AppError(400, "Rad etilgan so'rovni tasdiqlash mumkin emas")

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
        duration_days = PremiumSettings.get().duration_days

    now = timezone.now()
    admin_user = request.current_user
    admin_name = _admin_display_name(admin_user)

    with transaction.atomic():
        # Premium muddatini hisoblash: mavjud aktiv premium'dan uzaytirish
        user = User.objects.select_for_update().filter(telegram_id=pr.telegram_id).first()
        if not user:
            raise AppError(404, "Foydalanuvchi topilmadi (akkaunt o'chirilgandir)")

        base = user.premium_until if (user.premium_until and user.premium_until > now) else now
        new_until = base + timedelta(days=duration_days)

        user.premium_until = new_until
        user.premium_granted_by_telegram_id = admin_user.telegram_id
        user.premium_granted_by_name = admin_name
        user.premium_granted_at = now
        user.save(update_fields=[
            "premium_until",
            "premium_granted_by_telegram_id",
            "premium_granted_by_name",
            "premium_granted_at",
        ])

        pr.status = PremiumRequest.STATUS_APPROVED
        pr.reviewed_by_telegram_id = admin_user.telegram_id
        pr.reviewed_by_name = admin_name
        pr.reviewed_at = now
        pr.granted_until = new_until
        pr.save(update_fields=[
            "status",
            "reviewed_by_telegram_id",
            "reviewed_by_name",
            "reviewed_at",
            "granted_until",
        ])

    logger.info(
        "premium_request_approved",
        extra={
            "event": "premium_request_approved",
            "request_id": pr.pk,
            "telegram_id": pr.telegram_id,
            "by": admin_user.telegram_id,
            "days": duration_days,
            "until": new_until.isoformat(),
        },
    )

    # Foydalanuvchiga xabar
    try:
        send_message_sync(
            pr.telegram_id,
            f"🎉 <b>To'lovingiz tasdiqlandi!</b>\n\n"
            f"Premium <b>{duration_days} kunga</b> faollashtirildi.\n"
            f"Muddati: {new_until.strftime('%d.%m.%Y')}\n\n"
            f"Zakovatdan rohatlaning! 🏆",
            with_mini_app_button=True,
        )
    except Exception:
        logger.warning(
            "premium_approve_notify_user_failed telegram_id=%s", pr.telegram_id, exc_info=True
        )

    return Response(pr.to_dict())


# ── Admin: so'rovni rad etish ─────────────────────────────────────────────────

@api_view(["POST"])
@require_admin
def admin_reject_request(request, request_id: int):
    """Premium so'rovni rad etish.

    POST /api/admin/premium/requests/<id>/reject
    Body (ixtiyoriy): { "reason": str }
    Response: so'rov dict'i (yangilangan)
    """
    from apps.core.telegram_notifier import send_message_sync

    pr = PremiumRequest.objects.filter(pk=request_id).first()
    if not pr:
        raise AppError(404, "So'rov topilmadi")

    if pr.status == PremiumRequest.STATUS_REJECTED:
        return Response(pr.to_dict())  # idempotent

    if pr.status == PremiumRequest.STATUS_APPROVED:
        raise AppError(400, "Allaqachon tasdiqlangan so'rovni rad etib bo'lmaydi")

    body = request.data if isinstance(request.data, dict) else {}
    reason = (body.get("reason") or "").strip()

    now = timezone.now()
    admin_user = request.current_user
    admin_name = _admin_display_name(admin_user)

    pr.status = PremiumRequest.STATUS_REJECTED
    pr.reviewed_by_telegram_id = admin_user.telegram_id
    pr.reviewed_by_name = admin_name
    pr.reviewed_at = now
    pr.reject_reason = reason
    pr.save(update_fields=[
        "status",
        "reviewed_by_telegram_id",
        "reviewed_by_name",
        "reviewed_at",
        "reject_reason",
    ])

    logger.info(
        "premium_request_rejected",
        extra={
            "event": "premium_request_rejected",
            "request_id": pr.pk,
            "telegram_id": pr.telegram_id,
            "by": admin_user.telegram_id,
            "reason": reason[:100],
        },
    )

    # Foydalanuvchiga xabar
    if reason:
        user_text = (
            f"❌ <b>To'lovingiz rad etildi.</b>\n\n"
            f"Sabab: {reason}\n\n"
            f"To'g'ri to'lov cheki bilan qayta urinib ko'ring."
        )
    else:
        user_text = (
            "❌ <b>To'lovingiz tasdiqlanmadi.</b>\n\n"
            "Chek noto'g'ri yoki soxta bo'lishi mumkin. "
            "Iltimos to'g'ri to'lov cheki bilan qayta urinib ko'ring."
        )

    try:
        send_message_sync(pr.telegram_id, user_text, with_mini_app_button=True)
    except Exception:
        logger.warning(
            "premium_reject_notify_user_failed telegram_id=%s", pr.telegram_id, exc_info=True
        )

    return Response(pr.to_dict())


# ── Admin: tahlil ────────────────────────────────────────────────────────────

@api_view(["GET"])
@require_admin
def admin_premium_analytics(request):
    """Premium tizimi tahlili.

    GET /api/admin/premium/analytics
    Response: { activePremiumCount, pendingCount, approvedCount, rejectedCount,
                totalRevenue, recentRequests }
    """
    from django.db.models import Sum

    active_count = User.objects.filter(premium_until__gt=timezone.now()).count()
    pending_count = PremiumRequest.objects.filter(status=PremiumRequest.STATUS_PENDING).count()
    approved_count = PremiumRequest.objects.filter(status=PremiumRequest.STATUS_APPROVED).count()
    rejected_count = PremiumRequest.objects.filter(status=PremiumRequest.STATUS_REJECTED).count()

    revenue_agg = PremiumRequest.objects.filter(
        status=PremiumRequest.STATUS_APPROVED
    ).aggregate(total=Sum("amount"))
    total_revenue = revenue_agg["total"] or 0

    recent = [
        req.to_dict()
        for req in PremiumRequest.objects.all()[:10]
    ]

    return Response({
        "activePremiumCount": active_count,
        "pendingCount": pending_count,
        "approvedCount": approved_count,
        "rejectedCount": rejected_count,
        "totalRevenue": total_revenue,
        "recentRequests": recent,
    })


# ── Public: premium so'rovi (chek bilan) ─────────────────────────────────────

_IMAGE_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@api_view(["POST"])
@require_auth
@parser_classes([MultiPartParser, FormParser, JSONParser])
def premium_request(request):
    """Foydalanuvchi to'lov cheki yuklaydi va pending so'rov yaratiladi.

    POST /api/premium/request
    Content-Type: multipart/form-data
    Fields:
      receipt  — rasm fayl (majburiy, image/*, <=10MB)
      note     — ixtiyoriy eslatma (e'tiborga olinmaydi, faqat log uchun)
    Response: { ok: true, status: "pending", requestId: int }

    Cheklovlar:
      - Foydalanuvchida allaqachon PENDING so'rov bo'lsa — xato.
      - Faqat image/* qabul qilinadi.
    """
    from apps.core.telegram_notifier import send_message_sync
    from apps.users.repositories import _get_all_admin_telegram_ids

    user = request.current_user
    telegram_id: int = user.telegram_id

    # Allaqachon kutilayotgan so'rov bor-yo'qligini tekshirish
    existing_pending = PremiumRequest.objects.filter(
        telegram_id=telegram_id,
        status=PremiumRequest.STATUS_PENDING,
    ).first()
    if existing_pending:
        raise AppError(
            400,
            "Sizning so'rovingiz allaqachon ko'rib chiqilmoqda. "
            "Admin tasdiqlagunga yoki rad etgunga qadar yangi so'rov yubora olmaysiz."
        )

    # Rasm fayl
    receipt_file = request.FILES.get("receipt")
    if not receipt_file:
        raise AppError(400, "Chek rasmi ('receipt' field) majburiy")

    ct = receipt_file.content_type or ""
    if not ct.startswith("image/"):
        raise AppError(400, "Faqat rasm fayli yuklash mumkin (image/*)")

    file_bytes = receipt_file.read()
    if len(file_bytes) > _IMAGE_MAX_BYTES:
        raise AppError(400, "Rasm hajmi 10 MB dan oshmasligi kerak")
    if len(file_bytes) == 0:
        raise AppError(400, "Fayl bo'sh")

    bot_token = getattr(django_settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise AppError(502, "Bot token sozlanmagan — server admini bilan bog'laning")

    # Chekni Telegram'ga yuborish
    storage_chat = _get_storage_chat(telegram_id)
    file_id = _relay_receipt_to_telegram(
        file_bytes=file_bytes,
        file_name=receipt_file.name or "receipt.jpg",
        content_type=ct,
        chat_id=storage_chat,
        bot_token=bot_token,
    )

    # Narx snapshot
    ps = PremiumSettings.get()
    amount = ps.price
    currency = ps.currency

    # Foydalanuvchi ismi snapshot
    first_name = (user.first_name or "").strip()
    last_name = (user.last_name or "").strip()
    display_name = f"{first_name} {last_name}".strip() or "Noma'lum"
    username = user.username

    pr = PremiumRequest.objects.create(
        telegram_id=telegram_id,
        display_name=display_name,
        username=username,
        status=PremiumRequest.STATUS_PENDING,
        receipt_file_id=file_id,
        receipt_media_type="image",
        amount=amount,
        currency=currency,
    )

    logger.info(
        "premium_request_created",
        extra={
            "event": "premium_request_created",
            "request_id": pr.pk,
            "telegram_id": telegram_id,
            "amount": amount,
        },
    )

    # Adminlarga xabar
    mention = f"@{username}" if username else f"ID: {telegram_id}"
    admin_text = (
        f"⭐ <b>Yangi to'lov cheki!</b>\n\n"
        f"👤 {display_name} ({mention})\n"
        f"🆔 {telegram_id}\n"
        f"💰 {amount} {currency}\n\n"
        f"Premiumga to'lov qildi — chekni tekshiring va tasdiqlang yoki rad eting.\n"
        f"Admin panel → Premium → So'rovlar"
    )

    admin_ids = _get_all_admin_telegram_ids()
    if not admin_ids:
        logger.warning("premium_request_created: adminlar yo'q, xabar yuborilmadi")
    else:
        for admin_id in admin_ids:
            try:
                send_message_sync(admin_id, admin_text, with_mini_app_button=False)
            except Exception:
                logger.warning(
                    "premium_request: admin %s ga xabar yuborishda xato",
                    admin_id,
                    exc_info=True,
                )

    return Response({"ok": True, "status": "pending", "requestId": pr.pk}, status=201)


# ── Public: premium info ──────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def premium_info(request):
    """Joriy foydalanuvchi uchun premium holati, sozlamalar va joriy so'rov.

    GET /api/premium/info
    Response:
    {
      enabled, price, currency, durationDays, benefits, paymentDetails, sections,
      isPremium, premiumUntil,
      usage: { round: { used, limit, remaining, limited }, ... },
      myRequest: { id, status, createdAt, rejectReason } | null
    }
    """
    user = request.current_user

    # Asosiy sozlama — har qanday xatoda ham (migratsiya/ustun yo'qligi) ekran
    # "Ma'lumot yuklanmadi" bo'lib qolmasligi uchun minimal javob qaytaramiz.
    try:
        ps = PremiumSettings.get()
        data = ps.to_dict()
    except Exception:
        logger.exception("premium_info: PremiumSettings xato — minimal javob qaytariladi")
        data = {
            "enabled": False, "price": 0, "currency": "so'm",
            "durationDays": 30, "benefits": "",
            "cardNumber": "", "cardHolder": "", "paymentDetails": "",
            "sections": {},
        }

    try:
        data["isPremium"] = user.is_premium_active()
        data["premiumUntil"] = user.premium_until.isoformat() if user.premium_until else None
    except Exception:
        logger.exception("premium_info: premium status xato")
        data["isPremium"] = False
        data["premiumUntil"] = None

    # usage va myRequest IXTIYORIY — xato bo'lsa (masalan migratsiya hali
    # qo'llanmagan: premium_premiumrequest jadvali yo'q) butun Premium ekrani
    # "Ma'lumot yuklanmadi" bo'lib qolmasligi uchun FAIL-SOFT qilamiz: asosiy
    # ma'lumot (narx, imtiyozlar) baribir qaytadi, ekran ochiladi.
    try:
        data["usage"] = get_usage(user)
    except Exception:
        logger.exception("premium_info: get_usage xato — bo'sh usage qaytariladi")
        data["usage"] = {}

    data["myRequest"] = None
    try:
        my_req = (
            PremiumRequest.objects.filter(telegram_id=user.telegram_id)
            .order_by("-created_at")
            .first()
        )
        if my_req and my_req.status in (PremiumRequest.STATUS_PENDING, PremiumRequest.STATUS_REJECTED):
            data["myRequest"] = {
                "id": my_req.pk,
                "status": my_req.status,
                "createdAt": my_req.created_at.isoformat() if my_req.created_at else None,
                "rejectReason": my_req.reject_reason,
            }
    except Exception:
        logger.exception("premium_info: myRequest xato — null qaytariladi")

    return Response(data)


# ── Public: premium xarid tarixi ─────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def premium_history(request):
    """Joriy foydalanuvchining tasdiqlangan premium so'rovlari tarixi.

    GET /api/premium/history
    Response: { items: [ { id, amount, currency, createdAt, durationDays, grantedUntil } ] }
    """
    user = request.current_user
    qs = (
        PremiumRequest.objects.filter(
            telegram_id=user.telegram_id,
            status=PremiumRequest.STATUS_APPROVED,
        )
        .order_by("-created_at")
    )

    items = []
    for req in qs:
        # durationDays ni granted_until - reviewed_at'dan hisoblaymiz, yo'q bo'lsa settings'dan
        duration_days = None
        if req.granted_until and req.reviewed_at:
            delta = req.granted_until - req.reviewed_at
            duration_days = max(1, round(delta.total_seconds() / 86400))
        if duration_days is None:
            try:
                duration_days = PremiumSettings.get().duration_days
            except Exception:
                duration_days = 30

        items.append({
            "id": req.pk,
            "amount": req.amount,
            "currency": req.currency,
            "createdAt": req.created_at.isoformat() if req.created_at else None,
            "durationDays": duration_days,
            "grantedUntil": req.granted_until.isoformat() if req.granted_until else None,
        })

    return Response({"items": items})
