"""Telegram auth middleware — Authorization: tma <initData> sarlavhasini o'qiydi.

`request.current_user` atributini o'rnatadi (yoki None). DRF view'lari shu atribut
orqali joriy foydalanuvchini oladi — eski Express `req.currentUser` bilan bir xil.
"""
from __future__ import annotations

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

        # Bot token auth: "bot <TELEGRAM_BOT_TOKEN>" — bot admin API uchun
        if header.lower().startswith("bot "):
            bot_token = header[4:].strip()
            configured = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
            if configured and bot_token == configured and settings.ADMIN_TELEGRAM_IDS:
                return TelegramUser(
                    telegram_id=settings.ADMIN_TELEGRAM_IDS[0],
                    first_name="Bot",
                    last_name=None,
                    username=None,
                )
            return None

        prefix = "tma "
        if not header.lower().startswith(prefix):
            return None
        init_data = header[len(prefix):].strip()
        return verify_init_data(init_data)
