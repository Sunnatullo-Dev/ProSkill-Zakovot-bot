"""Admin Board — /api/admin/board/* — @require_admin himoyasi ostida.

Barcha endpoint'lar admin-only:
  - GET  /api/admin/board         — xabarlar ro'yxati (pagination)
  - POST /api/admin/board         — yangi xabar (multipart/form-data)
  - DELETE /api/admin/board/<id>  — xabarni o'chirish (muallif yoki super-admin)
  - GET  /api/admin/board/<id>/media — media proxy (Telegram orqali)
"""
from __future__ import annotations

import json
import logging
import urllib.request

from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from apps.core.decorators import require_admin
from apps.core.exceptions import AppError

from .models import AdminPost


logger = logging.getLogger(__name__)

# Hajm chegaralari
_IMAGE_MAX_BYTES = 10 * 1024 * 1024   # 10 MB
_VIDEO_MAX_BYTES = 50 * 1024 * 1024   # 50 MB
_PROXY_MAX_BYTES = 50 * 1024 * 1024   # proxy uchun ham video limitiga teng

DEFAULT_LIMIT = 20
MAX_LIMIT = 50


def _is_super_admin(telegram_id: int) -> bool:
    return telegram_id in getattr(settings, "ADMIN_TELEGRAM_IDS", [])


def _get_storage_chat(poster_telegram_id: int) -> str | int:
    """Media saqlash uchun chat ID'sini oladi.

    1. ADMIN_MEDIA_CHAT_ID env o'zgaruvchisi bo'lsa — uni ishlatadi.
    2. Bo'lmasa — posting adminnning o'z telegram_id'siga yuboradi
       (u bot bilan /start bosgan bo'lishi kerak).
    """
    chat_id = getattr(settings, "ADMIN_MEDIA_CHAT_ID", "")
    if chat_id:
        try:
            return int(chat_id)
        except (ValueError, TypeError):
            return str(chat_id)
    return poster_telegram_id


def _relay_media_to_telegram(
    *,
    file_bytes: bytes,
    file_name: str,
    content_type: str,
    media_type: str,
    chat_id: str | int,
    bot_token: str,
) -> str:
    """Faylni Telegram'ga yuborib file_id qaytaradi.

    sendPhoto yoki sendVideo ishlatadi. file_id doimiy saqlanadi.
    """
    if media_type == "image":
        method = "sendPhoto"
        field = "photo"
    else:
        method = "sendVideo"
        field = "video"

    url = f"https://api.telegram.org/bot{bot_token}/{method}"

    import urllib.parse
    boundary = "----TelegramBotBoundary7f3k"

    def _encode_field(name: str, value: str) -> bytes:
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode("utf-8")

    def _encode_file(name: str, fname: str, ctype: str, data: bytes) -> bytes:
        header = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"; filename="{fname}"\r\n'
            f"Content-Type: {ctype}\r\n\r\n"
        ).encode("utf-8")
        return header + data + b"\r\n"

    body = (
        _encode_field("chat_id", str(chat_id))
        + _encode_file(field, file_name, content_type, file_bytes)
        + f"--{boundary}--\r\n".encode("utf-8")
    )

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
        logger.warning("Telegram sendPhoto/sendVideo xatosi: %s", exc)
        raise AppError(502, "Telegramga media yuborishda xato yuz berdi")

    if not data.get("ok"):
        desc = data.get("description", "Noma'lum xato")
        logger.warning("Telegram API rad etdi: %s", desc)
        raise AppError(502, f"Telegram media qabul qilmadi: {desc}")

    result = data.get("result", {})
    if media_type == "image":
        # sendPhoto — photo array qaytaradi, eng katta versiya oxirgi
        photos = result.get("photo", [])
        if not photos:
            raise AppError(502, "Telegram rasm file_id qaytarmadi")
        file_id = photos[-1]["file_id"]
    else:
        video = result.get("video", {})
        file_id = video.get("file_id", "")
        if not file_id:
            raise AppError(502, "Telegram video file_id qaytarmadi")

    return file_id


def _proxy_telegram_file(file_id: str, bot_token: str) -> tuple[bytes, str]:
    """Telegram'dan file_id orqali fayl oladi.

    Returns: (bytes_content, content_type)
    Gamerooms resolve_question_media bilan bir xil yondashuv.
    """
    get_file_url = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"
    try:
        with urllib.request.urlopen(get_file_url, timeout=10) as resp:  # noqa: S310
            data = json.loads(resp.read().decode())
    except Exception as exc:
        logger.warning("Telegram getFile xatosi: %s", exc)
        raise AppError(502, "Telegram media manzilini olishda xato")

    if not data.get("ok"):
        raise AppError(404, "Telegram file topilmadi (file_id eskirgan yoki noto'g'ri)")

    file_path = data.get("result", {}).get("file_path", "")
    if not file_path:
        raise AppError(502, "Telegram file_path bo'sh qaytdi")

    download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
    try:
        with urllib.request.urlopen(download_url, timeout=30) as resp:  # noqa: S310
            content_length = resp.headers.get("Content-Length")
            if content_length is not None and int(content_length) > _PROXY_MAX_BYTES:
                raise AppError(413, "Media fayli juda katta")
            content = resp.read(_PROXY_MAX_BYTES + 1)
            if len(content) > _PROXY_MAX_BYTES:
                raise AppError(413, "Media fayli juda katta")
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
    except AppError:
        raise
    except Exception as exc:
        logger.warning("Telegram fayl yuklab olishda xato: %s", exc)
        raise AppError(502, "Telegram faylni yuklab olishda xato")

    return content, content_type


def _serialize_post(post: AdminPost, *, requester_telegram_id: int) -> dict:
    media_url = None
    if post.media_file_id and post.media_type:
        media_url = f"/api/admin/board/{post.id}/media"

    can_delete = (
        post.author_telegram_id == requester_telegram_id
        or _is_super_admin(requester_telegram_id)
    )

    return {
        "id": post.id,
        "authorTelegramId": post.author_telegram_id,
        "authorName": post.author_name,
        "text": post.text,
        "mediaType": post.media_type or None,
        "mediaUrl": media_url,
        "createdAt": post.created_at.isoformat(),
        "canDelete": can_delete,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
@parser_classes([MultiPartParser, FormParser, JSONParser])
def board_collection(request):
    """
    GET  /api/admin/board  — xabarlar ro'yxati (yangi → eski, pagination)
    POST /api/admin/board  — yangi xabar yuborish (multipart/form-data)
    """
    user = request.current_user

    if request.method == "GET":
        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except (ValueError, TypeError):
            raise AppError(400, "page noto'g'ri")
        try:
            limit = max(1, min(MAX_LIMIT, int(request.query_params.get("limit") or DEFAULT_LIMIT)))
        except (ValueError, TypeError):
            raise AppError(400, "limit noto'g'ri")

        offset = (page - 1) * limit
        qs = AdminPost.objects.all().order_by("-created_at")
        total = qs.count()
        posts = list(qs[offset : offset + limit])

        return Response({
            "items": [_serialize_post(p, requester_telegram_id=user.telegram_id) for p in posts],
            "total": total,
            "page": page,
            "limit": limit,
        })

    # POST — yangi xabar
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise AppError(502, "Bot token sozlanmagan — server admini bilan bog'laning")

    text = (request.data.get("text") or "").strip()
    media_file = request.FILES.get("media")

    if not text and not media_file:
        raise AppError(400, "Matn yoki media bo'lishi shart")

    media_type = ""
    media_file_id = ""

    if media_file:
        content_type_header = media_file.content_type or ""
        if content_type_header.startswith("image/"):
            media_type = "image"
            max_bytes = _IMAGE_MAX_BYTES
        elif content_type_header.startswith("video/"):
            media_type = "video"
            max_bytes = _VIDEO_MAX_BYTES
        else:
            raise AppError(400, "Faqat rasm (image/*) yoki video (video/*) yuklash mumkin")

        file_bytes = media_file.read()
        if len(file_bytes) > max_bytes:
            limit_mb = max_bytes // (1024 * 1024)
            raise AppError(400, f"Fayl hajmi {limit_mb} MB dan oshmasligi kerak")

        chat_id = _get_storage_chat(user.telegram_id)
        media_file_id = _relay_media_to_telegram(
            file_bytes=file_bytes,
            file_name=media_file.name or "upload",
            content_type=content_type_header,
            media_type=media_type,
            chat_id=chat_id,
            bot_token=bot_token,
        )

    # Author nomi
    author_name = getattr(user, "first_name", "") or ""
    if getattr(user, "last_name", ""):
        author_name = (author_name + " " + user.last_name).strip()
    if not author_name:
        author_name = f"Admin {user.telegram_id}"

    post = AdminPost.objects.create(
        author_telegram_id=user.telegram_id,
        author_name=author_name,
        text=text,
        media_type=media_type,
        media_file_id=media_file_id,
    )

    return Response(_serialize_post(post, requester_telegram_id=user.telegram_id), status=201)


@api_view(["DELETE"])
@require_admin
def board_detail(request, post_id: int):
    """DELETE /api/admin/board/<id> — xabarni o'chirish."""
    user = request.current_user

    post = AdminPost.objects.filter(id=post_id).first()
    if not post:
        raise AppError(404, "Xabar topilmadi")

    # Faqat muallif yoki super-admin o'chira oladi
    if post.author_telegram_id != user.telegram_id and not _is_super_admin(user.telegram_id):
        raise AppError(403, "Faqat muallif yoki super-admin bu xabarni o'chira oladi")

    post.delete()
    return Response({"ok": True})


@api_view(["GET"])
@require_admin
def board_media(request, post_id: int):
    """GET /api/admin/board/<id>/media — Telegram orqali media proxy."""
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        raise AppError(502, "Bot token sozlanmagan")

    post = AdminPost.objects.filter(id=post_id).first()
    if not post:
        raise AppError(404, "Xabar topilmadi")

    if not post.media_file_id:
        raise AppError(404, "Bu xabarda media yo'q")

    content, content_type = _proxy_telegram_file(post.media_file_id, bot_token)
    response = HttpResponse(content, content_type=content_type)
    response["Cache-Control"] = "private, max-age=3600"
    return response
