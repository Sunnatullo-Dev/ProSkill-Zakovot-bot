"""Mobil ilova (Flutter) uchun auth endpointlari — JWT asosida.

Mavjud Telegram oqimi (`views.login`) o'zgarmaydi — ikkala kirish yo'li
parallel ishlaydi.

    POST   /api/auth/register          — telefon + parol bilan ro'yxatdan o'tish
    POST   /api/auth/login/password    — telefon + parol bilan kirish
    POST   /api/auth/token/refresh     — access tokenni yangilash (rotatsiya bilan)
    POST   /api/auth/logout            — joriy refresh tokenni bekor qilish
    POST   /api/auth/logout/all        — barcha qurilmalardan chiqish
    GET    /api/auth/me                — joriy profil
    PATCH  /api/auth/password          — parolni o'zgartirish / o'rnatish
    POST   /api/auth/link-telegram     — Telegram akkauntini bog'lash
"""
from __future__ import annotations

import logging

from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError
from apps.core.telegram_auth import is_admin, verify_init_data
from apps.users.models import User

from . import services
from .credentials import (
    normalize_phone,
    validate_display_name,
    validate_password,
)
from .tokens import decode_refresh, issue_token_pair, revoke_refresh, rotate_refresh


logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {"uz-latn", "uz-cyrl", "ru"}


def _body(request) -> dict:
    return request.data if isinstance(request.data, dict) else {}


def _auth_response(user: User) -> Response:
    pair = issue_token_pair(user)
    return Response(
        {
            "user": services.serialize_user(user),
            "isAdmin": is_admin(user.telegram_id),
            "tokens": pair.to_dict(),
        }
    )


# ─── Ro'yxatdan o'tish ────────────────────────────────────────────────────────

@api_view(["POST"])
@ratelimit(key="ip", rate="10/h", block=True)
def register(request):
    """Telefon + parol bilan yangi akkaunt.

    Body: {phone, password, firstName, lastName?, email?, language?}
    Javob: 201 {user, isAdmin, tokens}
    """
    body = _body(request)

    phone = normalize_phone(body.get("phone"))
    password = validate_password(body.get("password"))
    first_name = validate_display_name(body.get("firstName"), field="Ism")

    last_name_raw = body.get("lastName")
    last_name = (
        validate_display_name(last_name_raw, field="Familiya")
        if isinstance(last_name_raw, str) and last_name_raw.strip()
        else None
    )

    email_raw = body.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) and email_raw.strip() else None

    language = body.get("language")
    if language not in SUPPORTED_LANGUAGES:
        language = "uz-latn"

    user = services.register_with_phone(
        phone=phone,
        password=password,
        first_name=first_name,
        last_name=last_name,
        email=email,
        language=language,
    )

    response = _auth_response(user)
    response.status_code = 201
    return response


# ─── Kirish ───────────────────────────────────────────────────────────────────

@api_view(["POST"])
@ratelimit(key="ip", rate="20/m", block=True)
def login_with_password(request):
    """Telefon + parol bilan kirish.

    Body: {phone, password}
    Javob: {user, isAdmin, tokens}
    """
    body = _body(request)

    phone = normalize_phone(body.get("phone"))
    password = body.get("password")
    if not isinstance(password, str) or not password:
        raise AppError(400, "Parolni kiriting")

    user = services.authenticate_with_phone(phone=phone, password=password)
    return _auth_response(user)


# ─── Token yangilash ─────────────────────────────────────────────────────────

@api_view(["POST"])
@ratelimit(key="ip", rate="60/m", block=True)
def refresh_token(request):
    """Refresh token orqali yangi juftlik (rotatsiya bilan).

    Body: {refreshToken}
    Javob: {tokens, user}
    """
    body = _body(request)
    token = body.get("refreshToken") or body.get("refresh")
    if not isinstance(token, str) or not token:
        raise AppError(400, "refreshToken talab qilinadi")

    pair, user = rotate_refresh(token)
    return Response({"tokens": pair.to_dict(), "user": services.serialize_user(user)})


# ─── Chiqish ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
def logout(request):
    """Joriy refresh tokenni bekor qiladi.

    Body: {refreshToken}
    Auth talab qilinmaydi — token o'zi yetarli dalil.
    """
    body = _body(request)
    token = body.get("refreshToken") or body.get("refresh")
    if not isinstance(token, str) or not token:
        # Idempotent: token bo'lmasa ham muvaffaqiyat deb qaytaramiz —
        # kliyent lokal storage'ni tozalab, oqimni davom ettirsin.
        return Response({"ok": True})

    try:
        payload = decode_refresh(token)
        revoke_refresh(payload)
    except AppError:
        pass  # muddati o'tgan / yaroqsiz — baribir "chiqdi" deb hisoblaymiz

    return Response({"ok": True})


@api_view(["POST"])
@require_auth
def logout_all(request):
    """Barcha qurilmalardagi sessiyalarni bekor qiladi."""
    user = User.objects.filter(telegram_id=request.current_user.telegram_id).first()
    if not user:
        raise AppError(404, "Foydalanuvchi topilmadi")
    user.bump_token_version()
    return Response({"ok": True})


# ─── Profil ──────────────────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def me(request):
    user = User.objects.filter(telegram_id=request.current_user.telegram_id).first()
    if not user:
        raise AppError(404, "Foydalanuvchi topilmadi")
    return Response(
        {"user": services.serialize_user(user), "isAdmin": is_admin(user.telegram_id)}
    )


# ─── Parolni o'zgartirish ────────────────────────────────────────────────────

@api_view(["PATCH"])
@require_auth
@ratelimit(key="ip", rate="10/h", block=True)
def change_password(request):
    """Parolni o'zgartiradi yoki Telegram akkauntiga birinchi marta o'rnatadi.

    Body: {currentPassword?, newPassword}
    Muvaffaqiyatdan keyin BARCHA eski tokenlar bekor qilinadi —
    javobda yangi juftlik qaytariladi.
    """
    body = _body(request)
    new_password = validate_password(body.get("newPassword"))
    current_password = body.get("currentPassword")
    if current_password is not None and not isinstance(current_password, str):
        raise AppError(400, "currentPassword matn bo'lishi kerak")

    user = User.objects.filter(telegram_id=request.current_user.telegram_id).first()
    if not user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    services.change_password(
        user=user, current_password=current_password, new_password=new_password
    )

    user.refresh_from_db()
    return _auth_response(user)


# ─── Telegram akkauntini bog'lash ────────────────────────────────────────────

@api_view(["POST"])
@require_auth
def link_telegram(request):
    """Telefon akkauntini Telegram akkaunti bilan bog'laydi (initData orqali).

    Body: {initData}  — Telegram Login Widget yoki Mini App'dan olingan
    Javob: {user, tokens}  (eski tokenlar bekor qilinadi)
    """
    body = _body(request)
    init_data = body.get("initData")
    if not isinstance(init_data, str) or not init_data.strip():
        raise AppError(400, "initData talab qilinadi")

    telegram_user = verify_init_data(init_data)
    if not telegram_user or telegram_user.telegram_id <= 0:
        raise AppError(401, "Telegram ma'lumotlari tasdiqlanmadi")

    app_user = User.objects.filter(telegram_id=request.current_user.telegram_id).first()
    if not app_user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    linked = services.link_telegram_account(
        app_user=app_user,
        telegram_id=telegram_user.telegram_id,
        username=telegram_user.username,
    )
    return _auth_response(linked)


@api_view(["POST"])
@require_auth
@ratelimit(key="ip", rate="15/h", block=True)
def create_telegram_link_token(request):
    """Mobil ilova uchun bir martalik Telegram linking token yaratadi.

    Javob: { token, botUsername, linkUrl, expiresInSeconds }
    """
    app_user = User.objects.filter(telegram_id=request.current_user.telegram_id).first()
    if not app_user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    res = services.create_telegram_link_token(app_user)
    return Response(res)


@api_view(["POST"])
@ratelimit(key="ip", rate="30/m", block=True)
def confirm_telegram_link(request):
    """Telegram bot orqali bir martalik token bilan hisobni bog'laydi.

    Body: { token, telegramId, username?, firstName?, lastName? }
    Javob: { ok, message, user }
    """
    body = _body(request)
    token = body.get("token")
    telegram_id_raw = body.get("telegramId")

    if not isinstance(token, str) or not token.strip():
        raise AppError(400, "token talab qilinadi")

    try:
        telegram_id = int(telegram_id_raw)
    except (TypeError, ValueError):
        raise AppError(400, "telegramId musbat son bo'lishi kerak")

    username = body.get("username")
    first_name = body.get("firstName")
    last_name = body.get("lastName")

    linked_user = services.confirm_telegram_link_token(
        token=token.strip(),
        telegram_id=telegram_id,
        username=username if isinstance(username, str) else None,
        first_name=first_name if isinstance(first_name, str) else None,
        last_name=last_name if isinstance(last_name, str) else None,
    )

    return Response({
        "ok": True,
        "message": "Telegram hisobi muvaffaqiyatli bog'landi",
        "user": services.serialize_user(linked_user),
    })


@api_view(["GET"])
@require_auth
def telegram_link_status(request):
    """Foydalanuvchining Telegram akkaunti bog'langanligini tekshiradi."""
    app_user = User.objects.filter(telegram_id=request.current_user.telegram_id).first()
    if not app_user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    is_linked = not app_user.is_app_account()
    return Response({
        "isLinked": is_linked,
        "telegramId": app_user.telegram_id if is_linked else None,
        "username": app_user.username if is_linked else None,
    })

