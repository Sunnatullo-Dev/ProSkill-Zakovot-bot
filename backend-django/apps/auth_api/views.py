"""POST /api/auth/login — Telegram initData ni tekshiradi va user'ni upsert qiladi."""
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
        # Dev/test rejimda — eski Express qoidasiga ko'ra mehmon foydalanuvchi qaytariladi.
        if getattr(settings, "IS_PRODUCTION", False):
            raise AppError(401, "Telegram autentifikatsiya talab qilinadi")
        return Response(
            {
                "user": {
                    "id": "0",
                    "telegramId": 0,
                    "firstName": "Zakovatchi",
                    "lastName": None,
                    "username": "guest",
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
