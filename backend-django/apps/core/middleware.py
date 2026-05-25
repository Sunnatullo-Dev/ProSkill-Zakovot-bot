"""Telegram auth middleware — Authorization: tma <initData> sarlavhasini o'qiydi.

`request.current_user` atributini o'rnatadi (yoki None). DRF view'lari shu atribut
orqali joriy foydalanuvchini oladi — eski Express `req.currentUser` bilan bir xil.
"""
from __future__ import annotations

import hmac
from typing import Callable

from django.conf import settings

from .telegram_auth import TelegramUser, verify_init_data


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

        # Server-internal admin auth: "bot <BOT_INTERNAL_API_KEY>" — Telegram boti
        # serverdagi admin endpoint'larini chaqirishi uchun.
        # MUHIM: bu kalit Telegram bot tokeni EMAS. Bot tokeni Telegram bilan baham
        # ko'riladi va loglarda paydo bo'lishi mumkin; uni admin huquqi sifatida
        # ishlatish — token sizib ketsa to'liq admin huquqlari ham ketadi degani.
        # Shu uchun alohida `BOT_INTERNAL_API_KEY` ishlatamiz.
        if header.lower().startswith("bot "):
            provided_key = header[4:].strip()
            internal_key = getattr(settings, "BOT_INTERNAL_API_KEY", "") or ""
            if not internal_key or not settings.ADMIN_TELEGRAM_IDS:
                # Kalit sozlanmagan yoki admin yo'q — bu path butunlay o'chiq.
                return None
            # constant-time taqqoslash — timing attack qarshi
            if not hmac.compare_digest(provided_key, internal_key):
                return None
            return TelegramUser(
                telegram_id=settings.ADMIN_TELEGRAM_IDS[0],
                first_name="Bot",
                last_name=None,
                username=None,
            )

        prefix = "tma "
        if not header.lower().startswith(prefix):
            return None
        init_data = header[len(prefix):].strip()
        return verify_init_data(init_data)
