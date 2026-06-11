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

# initData muddati: Telegram ba'zan invite link orqali ochilganda eski
# cached initData yuboradi. 24 soat haddan tashqari qisqa — 7 kun ishlatamiz.
# HMAC imzosi replay attack'dan himoyalaydi; auth_date faqat qo'shimcha himoya.
INIT_DATA_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


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
        # Guest fallback faqat ALLOW_GUEST_AUTH=true bo'lganida ishlaydi.
        # Production'da bu env var o'rnatilgan bo'lsa settings.py ImproperlyConfigured
        # tashlaydi — bu yerga yetib kelmaslik kerak.
        allow_guest = getattr(settings, "ALLOW_GUEST_AUTH", False)
        if not allow_guest:
            logger.warning(
                "verify_init_data: 'guest' rad etildi — ALLOW_GUEST_AUTH=true "
                "o'rnatilmagan. (frontend guest token yubordi; VITE_API_URL va "
                "Mini App URL'ni tekshiring)"
            )
            return None
        logger.warning(
            "verify_init_data: DIQQAT — guest auth qabul qilindi! "
            "ALLOW_GUEST_AUTH=true faqat local dev uchun ishlatilsin."
        )
        return TelegramUser(telegram_id=0, first_name=None, last_name=None, username=None)

    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.error(
            "verify_init_data: TELEGRAM_BOT_TOKEN not configured — "
            "all signed initData will be rejected"
        )
        return None

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        logger.warning("verify_init_data: initData missing `hash` field")
        return None

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", token.encode("utf-8"), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        # Token noto'g'ri sozlangan eng keng tarqalgan sabab. Sanitize log —
        # received_hash to'liq emas, faqat oxirgi 8 belgini ko'rsatamiz.
        logger.warning(
            "verify_init_data: HMAC mismatch. Check TELEGRAM_BOT_TOKEN matches "
            "the bot @BotFather gave you. (received hash ...%s)",
            received_hash[-8:] if len(received_hash) >= 8 else "?",
        )
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
            logger.warning(
                "verify_init_data: initData muddati o'tgan (%ss = %.1f kun eski). "
                "Telegram cached initData yuborishi mumkin. MAX_AGE: %ss",
                age, age / 86400, INIT_DATA_MAX_AGE_SECONDS,
            )
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
    # 1) Env'da yozilgan super-admin'lar (har doim admin)
    if telegram_id in settings.ADMIN_TELEGRAM_IDS:
        return True
    # 2) Bot orqali qo'shilgan adminlar (DB jadvali)
    # Import inside function — settings.py top-level import'larni
    # aylanma bog'liqlikdan saqlash uchun.
    try:
        from apps.users.models import BotAdmin
        return BotAdmin.objects.filter(telegram_id=telegram_id).exists()
    except Exception:  # noqa: BLE001
        # Migratsiya hali ishlamagan bo'lsa table topilmaydi — env'ga qaytamiz
        return False
