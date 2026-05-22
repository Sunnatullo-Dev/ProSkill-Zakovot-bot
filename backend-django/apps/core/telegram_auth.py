"""Telegram WebApp initData ni HMAC orqali tekshirish.

Eski `backend/src/middleware/auth.middleware.ts` ning Python varianti.
"""
from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qsl

from django.conf import settings


@dataclass
class TelegramUser:
    telegram_id: int
    first_name: Optional[str]
    last_name: Optional[str]
    username: Optional[str]


def verify_init_data(init_data: str) -> Optional[TelegramUser]:
    """initData ichidagi `hash` ni bot tokeni bilan tekshiradi.

    Muvaffaqiyatli bo'lsa TelegramUser qaytaradi, aks holda None.
    Dev rejimida `initData == "guest"` mehmonni qaytarib beradi —
    production'da bu rad etiladi.
    """
    if not init_data:
        return None

    if init_data.strip() == "guest":
        # Guest fallback faqat dev/test rejimda — production'da rad etiladi.
        if getattr(settings, "IS_PRODUCTION", False):
            return None
        return TelegramUser(telegram_id=0, first_name="Zakovatchi", last_name=None, username="guest")

    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return None

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", token.encode("utf-8"), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        return None

    user_json = pairs.get("user")
    if not user_json:
        return None

    try:
        user = json.loads(user_json)
    except json.JSONDecodeError:
        return None

    return TelegramUser(
        telegram_id=int(user.get("id", 0)),
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        username=user.get("username"),
    )


def is_admin(telegram_id: int) -> bool:
    return telegram_id in settings.ADMIN_TELEGRAM_IDS
