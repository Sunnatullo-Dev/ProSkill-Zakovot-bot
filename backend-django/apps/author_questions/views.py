"""Muallif savollari API endpoint'lari.

Public  : POST /api/author-questions            — require_auth
Admin   : GET  /api/admin/author-questions       — require_admin
Admin   : POST /api/admin/author-questions/<id>/approve — require_admin
Admin   : POST /api/admin/author-questions/<id>/reject  — require_admin
"""
from __future__ import annotations

import logging

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin, require_auth
from apps.core.exceptions import AppError
from apps.core.telegram_notifier import send_message_sync
from apps.users.repositories import _get_all_admin_telegram_ids

from .models import AuthorQuestion


logger = logging.getLogger(__name__)

MAX_PENDING_PER_USER = 3  # Spam himoyasi: bir foydalanuvchi ko'pi bilan shu qadar kutilayotgan savol yubora oladi
MAX_QUESTION_LEN = 2000
MAX_ANSWER_LEN = 500
MAX_AUTHOR_NAME_LEN = 100
DEFAULT_LIMIT = 20
MAX_LIMIT = 50


def _admin_display_name(admin_user) -> str:
    first = (getattr(admin_user, "first_name", "") or "").strip()
    last = (getattr(admin_user, "last_name", "") or "").strip()
    name = f"{first} {last}".strip()
    return name or f"Admin {admin_user.telegram_id}"


def _coerce_text(raw, *, field: str, max_len: int) -> str:
    if not isinstance(raw, str):
        raise AppError(400, f"{field} kerak")
    stripped = raw.strip()
    if not stripped:
        raise AppError(400, f"{field} bo'sh bo'lmasin")
    if len(stripped) > max_len:
        raise AppError(400, f"{field} {max_len} belgidan oshmasin")
    return stripped


# ── Public: savol yuborish ────────────────────────────────────────────────────

@api_view(["POST"])
@require_auth
def submit_author_question(request):
    """Foydalanuvchi yangi muallif savoli yuboradi.

    POST /api/author-questions
    Body: { questionText, answer, authorName }
    Response: { ok: true }
    """
    user = request.current_user
    telegram_id: int = user.telegram_id

    body = request.data if isinstance(request.data, dict) else {}

    question_text = _coerce_text(body.get("questionText"), field="Savol matni", max_len=MAX_QUESTION_LEN)
    answer = _coerce_text(body.get("answer"), field="To'g'ri javob", max_len=MAX_ANSWER_LEN)
    author_name = _coerce_text(body.get("authorName"), field="Muallif ismi", max_len=MAX_AUTHOR_NAME_LEN)

    # Spam himoyasi: foydalanuvchida allaqachon MAX_PENDING_PER_USER ta kutilayotgan savol bor
    pending_count = AuthorQuestion.objects.filter(
        telegram_id=telegram_id,
        status=AuthorQuestion.STATUS_PENDING,
    ).count()
    if pending_count >= MAX_PENDING_PER_USER:
        raise AppError(
            400,
            f"Sizda allaqachon {pending_count} ta ko'rib chiqilmagan savol bor. "
            "Admin tekshirib bo'lgandan keyin yangi savol yuboring."
        )

    aq = AuthorQuestion.objects.create(
        telegram_id=telegram_id,
        author_name=author_name,
        question_text=question_text,
        answer=answer,
    )

    logger.info(
        "author_question_submitted",
        extra={
            "event": "author_question_submitted",
            "id": aq.pk,
            "telegram_id": telegram_id,
        },
    )

    # Adminlarga xabar yuborish
    first_name = (getattr(user, "first_name", "") or "").strip()
    username = getattr(user, "username", None)
    mention = f"@{username}" if username else f"ID: {telegram_id}"
    display = first_name or mention

    admin_text = (
        f"✍️ <b>Yangi muallif savoli!</b>\n\n"
        f"\U0001f464 {display} ({mention})\n"
        f"\U0001f4dd Muallif ismi: <b>{author_name}</b>\n\n"
        f"<b>Savol:</b>\n{question_text[:300]}{'...' if len(question_text) > 300 else ''}\n\n"
        f"<b>Javob:</b> {answer[:200]}{'...' if len(answer) > 200 else ''}\n\n"
        f"Admin panel → Muallif savollari → Kutilmoqda"
    )

    admin_ids = _get_all_admin_telegram_ids()
    for admin_id in admin_ids:
        try:
            send_message_sync(admin_id, admin_text, with_mini_app_button=False)
        except Exception:
            logger.warning("author_question: admin %s ga xabar yuborishda xato", admin_id, exc_info=True)

    return Response({"ok": True}, status=201)


# ── Admin: ro'yxat ────────────────────────────────────────────────────────────

@api_view(["GET"])
@require_admin
def admin_list_author_questions(request):
    """Muallif savollari ro'yxati (admin uchun).

    GET /api/admin/author-questions?status=pending|approved|rejected&page=&limit=
    Response: { items: [...], total: int, page: int, limit: int }
    """
    status_filter = (request.query_params.get("status") or "").strip()
    valid_statuses = {AuthorQuestion.STATUS_PENDING, AuthorQuestion.STATUS_APPROVED, AuthorQuestion.STATUS_REJECTED}
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

    qs = AuthorQuestion.objects.all()
    if status_filter:
        qs = qs.filter(status=status_filter)

    total = qs.count()
    offset = (page - 1) * limit
    items = [aq.to_dict() for aq in qs[offset: offset + limit]]

    return Response({"items": items, "total": total, "page": page, "limit": limit})


# ── Admin: tasdiqlash ─────────────────────────────────────────────────────────

@api_view(["POST"])
@require_admin
def admin_approve_author_question(request, question_id: int):
    """Muallif savolini tasdiqlash.

    POST /api/admin/author-questions/<id>/approve
    Response: savol dict'i

    MUHIM: Bu savol asosiy Question jadvaliga QO'SHILMAYDI.
    Faqat status=approved ga o'zgaradi — alohida "Mualliflik savollari" pool.
    """
    aq = AuthorQuestion.objects.filter(pk=question_id).first()
    if not aq:
        raise AppError(404, "Savol topilmadi")

    if aq.status == AuthorQuestion.STATUS_APPROVED:
        return Response(aq.to_dict())  # idempotent

    if aq.status == AuthorQuestion.STATUS_REJECTED:
        raise AppError(400, "Rad etilgan savolni tasdiqlash mumkin emas")

    now = timezone.now()
    admin_user = request.current_user
    admin_name = _admin_display_name(admin_user)

    aq.status = AuthorQuestion.STATUS_APPROVED
    aq.reviewed_by_telegram_id = admin_user.telegram_id
    aq.reviewed_by_name = admin_name
    aq.reviewed_at = now
    aq.save(update_fields=["status", "reviewed_by_telegram_id", "reviewed_by_name", "reviewed_at"])

    logger.info(
        "author_question_approved",
        extra={
            "event": "author_question_approved",
            "id": aq.pk,
            "telegram_id": aq.telegram_id,
            "by": admin_user.telegram_id,
        },
    )

    # Foydalanuvchiga xabar
    try:
        send_message_sync(
            aq.telegram_id,
            f"✅ <b>Savolingiz qabul qilindi!</b>\n\n"
            f"Muallif ismi: <b>{aq.author_name}</b>\n"
            f"Savol: {aq.question_text[:200]}{'...' if len(aq.question_text) > 200 else ''}\n\n"
            f"Savolingiz \"Mualliflik savollari\" pooliga qo'shildi. Rahmat!",
            with_mini_app_button=True,
        )
    except Exception:
        logger.warning("author_question_approve: foydalanuvchiga xabar yuborishda xato", exc_info=True)

    return Response(aq.to_dict())


# ── Admin: rad etish ──────────────────────────────────────────────────────────

@api_view(["POST"])
@require_admin
def admin_reject_author_question(request, question_id: int):
    """Muallif savolini rad etish.

    POST /api/admin/author-questions/<id>/reject
    Body (ixtiyoriy): { reason: str }
    Response: savol dict'i
    """
    aq = AuthorQuestion.objects.filter(pk=question_id).first()
    if not aq:
        raise AppError(404, "Savol topilmadi")

    if aq.status == AuthorQuestion.STATUS_REJECTED:
        return Response(aq.to_dict())  # idempotent

    if aq.status == AuthorQuestion.STATUS_APPROVED:
        raise AppError(400, "Allaqachon tasdiqlangan savolni rad etib bo'lmaydi")

    body = request.data if isinstance(request.data, dict) else {}
    reason = (body.get("reason") or "").strip()

    now = timezone.now()
    admin_user = request.current_user
    admin_name = _admin_display_name(admin_user)

    aq.status = AuthorQuestion.STATUS_REJECTED
    aq.reviewed_by_telegram_id = admin_user.telegram_id
    aq.reviewed_by_name = admin_name
    aq.reviewed_at = now
    aq.reject_reason = reason
    aq.save(update_fields=[
        "status", "reviewed_by_telegram_id", "reviewed_by_name", "reviewed_at", "reject_reason"
    ])

    logger.info(
        "author_question_rejected",
        extra={
            "event": "author_question_rejected",
            "id": aq.pk,
            "telegram_id": aq.telegram_id,
            "by": admin_user.telegram_id,
            "reason": reason[:100],
        },
    )

    # Foydalanuvchiga xabar
    if reason:
        user_text = (
            f"❌ <b>Savolingiz rad etildi.</b>\n\n"
            f"Sabab: {reason}\n\n"
            f"Boshqa savol bilan qayta urinib ko'ring."
        )
    else:
        user_text = (
            "❌ <b>Savolingiz qabul qilinmadi.</b>\n\n"
            "Savol yoki javob noto'g'ri bo'lishi mumkin. "
            "Iltimos to'g'ri savol bilan qayta urinib ko'ring."
        )

    try:
        send_message_sync(aq.telegram_id, user_text, with_mini_app_button=True)
    except Exception:
        logger.warning("author_question_reject: foydalanuvchiga xabar yuborishda xato", exc_info=True)

    return Response(aq.to_dict())
