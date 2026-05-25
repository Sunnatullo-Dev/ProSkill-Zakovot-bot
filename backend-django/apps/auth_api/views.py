"""Auth API:

- POST /api/auth/login — initData'ni tekshiradi va foydalanuvchini upsert qiladi
- GET  /api/auth/whoami — joriy auth holatini qaytaradi (diagnostika uchun)
"""
from __future__ import annotations

from django.conf import settings
from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.exceptions import AppError
from apps.core.telegram_auth import is_admin, verify_init_data
from apps.users.repositories import set_referrer, upsert_user


@api_view(["POST"])
@ratelimit(key="ip", rate="20/m", block=True)
def login(request):
    init_data = request.data.get("initData") if isinstance(request.data, dict) else None
    referrer_raw = request.data.get("referrerId") if isinstance(request.data, dict) else None

    telegram_user = verify_init_data(init_data or "")

    if not telegram_user:
        # Production'da soxta yoki bo'sh initData rad etiladi.
        # Dev/test rejimda — bo'sh mehmon foydalanuvchi qaytariladi (ism yo'q,
        # frontend Telegram first_name'ini ko'rsatadi).
        if getattr(settings, "IS_PRODUCTION", False):
            raise AppError(401, "Telegram autentifikatsiya talab qilinadi")
        return Response(
            {
                "user": {
                    "id": "0",
                    "telegramId": 0,
                    "firstName": None,
                    "lastName": None,
                    "username": None,
                    "displayName": None,
                    "score": 0,
                },
                "isAdmin": False,
            }
        )

    user = upsert_user(
        telegram_user.telegram_id,
        telegram_user.first_name,
        telegram_user.last_name,
        telegram_user.username,
    )

    if referrer_raw is not None and telegram_user.telegram_id > 0:
        try:
            referrer_id = int(referrer_raw)
        except (TypeError, ValueError):
            raise AppError(400, "Noto'g'ri referrerId")
        if referrer_id > 0:
            set_referrer(telegram_user.telegram_id, referrer_id)

    return Response({"user": user, "isAdmin": is_admin(telegram_user.telegram_id)})


@api_view(["GET"])
def whoami(request):
    """Diagnostika: backend sizni qanday ko'ryapti?

    Middleware allaqachon `Authorization` header'ini o'qib `request.current_user`
    ni o'rnatgan. Shu yerda uni qaytaramiz. Auth bo'lmasa null. Bu endpoint
    sezgir ma'lumotlarni qaytarmaydi (faqat telegram_id va public bayroqlar) —
    har qanday foydalanuvchi o'z auth holatini ko'rishi mumkin.

    Foydalanish:
      curl -H "Authorization: tma <initData>" https://backend/api/auth/whoami
    """
    user = getattr(request, "current_user", None)
    has_token = bool(getattr(settings, "TELEGRAM_BOT_TOKEN", ""))
    admin_ids: list[int] = list(getattr(settings, "ADMIN_TELEGRAM_IDS", []))
    current_telegram_id = getattr(user, "telegram_id", 0) if user else 0
    is_in_admin_list = current_telegram_id in admin_ids if current_telegram_id > 0 else False

    return Response(
        {
            "isAuthenticated": user is not None,
            "telegramId": current_telegram_id,
            "isAdmin": is_admin(current_telegram_id) if user else False,
            "environment": {
                "isProduction": bool(getattr(settings, "IS_PRODUCTION", False)),
                "hasBotToken": has_token,
                "allowedHosts": list(getattr(settings, "ALLOWED_HOSTS", [])),
            },
            "diagnostic": {
                "guestPathEnabled": not bool(getattr(settings, "IS_PRODUCTION", False)),
                "willAcceptGuest": (
                    not bool(getattr(settings, "IS_PRODUCTION", False))
                ),
                # Admin diagnostic — eng ko'p uchraydigan "Nega admin tugmasi
                # ko'rinmayapti" muammosini darrov tashxis qilish uchun.
                # Aniq ID'lar qaytarilmaydi (PII), faqat hisoblar:
                "adminCount": len(admin_ids),
                "currentUserIsInAdminList": is_in_admin_list,
                # Yangi admin qo'shish maslahati uchun belgi:
                "adminListEmpty": len(admin_ids) == 0,
            },
        }
    )
