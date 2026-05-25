"""Telegram WebApp initData ni HMAC orqali tekshirish.

Eski `backend/src/middleware/auth.middleware.ts` ning Python varianti.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qsl

from django.conf import settings


logger = logging.getLogger(__name__)

# initData abadiy yaroqli bo'lmasin: 24 soatdan keyin yangilanishi shart.
# Bu replay attack oynasini kichraytiradi — masalan, log'dan yoki proxy'dan
# bir marta o'g'irlangan initData abadiy ishlatilmasin.
INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60


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
        # Ism bo'sh — frontend Telegram'dan first_name ko'rsatadi yoki "Foydalanuvchi" placeholder.
        if getattr(settings, "IS_PRODUCTION", False):
            return None
        return TelegramUser(telegram_id=0, first_name=None, last_name=None, username=None)

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

    # auth_date — initData yangiligini tekshiramiz. Eski blob replay attack
    # qarshi yopiladi. Telegram unix timestamp yuboradi.
    auth_date_raw = pairs.get("auth_date")
    if auth_date_raw:
        try:
            auth_date = int(auth_date_raw)
        except ValueError:
            logger.warning("verify_init_data: auth_date raqam emas: %r", auth_date_raw)
            return None
        now_seconds = int(time.time())
        age = now_seconds - auth_date
        if age < -60:  # 60s kelajak tomonga clock skew uchun ruxsat
            logger.warning("verify_init_data: auth_date kelajakda (%ss farq)", age)
            return None
        if age > INIT_DATA_MAX_AGE_SECONDS:
            logger.info("verify_init_data: initData muddati o'tgan (%ss eski)", age)
            return None

    user_json = pairs.get("user")
    if not user_json:
        return None

    try:
        user = json.loads(user_json)
    except json.JSONDecodeError:
        return None

    # user.id ni xavfsiz aylantirib, salbiy/nol qiymatlarni rad qilamiz.
    # Real Telegram foydalanuvchisining id'si har doim musbat int.
    # 0 yoki manfiy bo'lsa — bu mehmon (telegram_id=0) bilan adashish xavfi
    # yoki manipulatsiya urinishi.
    raw_id = user.get("id")
    try:
        telegram_id = int(raw_id)
    except (TypeError, ValueError):
        logger.warning("verify_init_data: user.id raqam emas: %r", raw_id)
        return None

    if telegram_id <= 0:
        logger.warning("verify_init_data: user.id musbat emas: %r", raw_id)
        return None

    return TelegramUser(
        telegram_id=telegram_id,
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        username=user.get("username"),
    )


def is_admin(telegram_id: int) -> bool:
    # Mehmon (telegram_id<=0) hech qachon admin bo'lolmaydi —
    # config xatosidan kelib chiqadigan eskalatsiyalarni oldini olamiz.
    if telegram_id <= 0:
        return False
    return telegram_id in settings.ADMIN_TELEGRAM_IDS
