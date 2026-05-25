"""Telegram auth middleware — Authorization: tma <initData> sarlavhasini o'qiydi.

`request.current_user` atributini o'rnatadi (yoki None). DRF view'lari shu atribut
orqali joriy foydalanuvchini oladi — eski Express `req.currentUser` bilan bir xil.
"""
from __future__ import annotations

import hmac
import logging
from typing import Callable

from django.conf import settings

from .telegram_auth import TelegramUser, verify_init_data


logger = logging.getLogger(__name__)

# Bot fallback warning — bir martagina log yozish uchun bayroq.
_bot_token_fallback_warned = False


class TelegramAuthMiddleware:
    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request):
        request.current_user = self._extract_user(request)
        return self.get_response(request)

    @staticmethod
    def _extract_user(request) -> TelegramUser | None:
        header = request.headers.get("Authorization") or request.headers.get("authorization") or ""
        if not header:
            return None

        # Server-internal admin auth: "bot <key>" — Telegram boti serverdagi
        # admin endpoint'larini chaqirishi uchun.
        #
        # Backward compat: ikki kalit ham qabul qilinadi (qaysi tekshiruv
        # mos kelsa). Bu foydalanuvchining bot va backend Render env'larida
        # qaysi kalit sozlangan bo'lsa ham ishlashini ta'minlaydi:
        #
        #   1) BOT_INTERNAL_API_KEY — afzal (alohida server-internal kalit;
        #      Telegram bot tokeni emas, log'larda ko'rinmaydi)
        #   2) TELEGRAM_BOT_TOKEN — fallback (eski sozlama yoki migratsiyada)
        #
        # Backend ikkalasini ham sinaydi. Bot tokenga qaytganda warning
        # log yoziladi (xavfsizlik uchun BOT_INTERNAL_API_KEY tavsiya).
        if header.lower().startswith("bot "):
            provided_key = header[4:].strip()
            if not provided_key or not settings.ADMIN_TELEGRAM_IDS:
                return None

            internal_key = getattr(settings, "BOT_INTERNAL_API_KEY", "") or ""
            bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""

            # 1) Internal kalitni sinash — afzal yo'l
            if internal_key and hmac.compare_digest(provided_key, internal_key):
                return _bot_admin_user()

            # 2) Bot tokenga qaytish — DOIM sinaymiz (internal_key sozlangan
            # bo'lsa-yu bot eski tokeni yubo'rsa ham ishlasin). Bu xavfsizroq
            # konfiguratsiyaga uzlasiz migratsiya imkonini beradi.
            if bot_token and hmac.compare_digest(provided_key, bot_token):
                global _bot_token_fallback_warned
                if not _bot_token_fallback_warned:
                    logger.warning(
                        "Bot admin auth using TELEGRAM_BOT_TOKEN as fallback — "
                        "set BOT_INTERNAL_API_KEY on BOTH backend and bot for "
                        "better security (bot token can leak in logs)."
                    )
                    _bot_token_fallback_warned = True
                return _bot_admin_user()

            return None

        prefix = "tma "
        if not header.lower().startswith(prefix):
            return None
        init_data = header[len(prefix):].strip()
        return verify_init_data(init_data)


def _bot_admin_user() -> TelegramUser:
    """Bot tomonidan chaqirilgan admin so'rovlari uchun synthetic admin user."""
    return TelegramUser(
        telegram_id=settings.ADMIN_TELEGRAM_IDS[0],
        first_name="Bot",
        last_name=None,
        username=None,
    )
