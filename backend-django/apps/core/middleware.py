"""Telegram auth middleware — Authorization: tma <initData> sarlavhasini o'qiydi.

`request.current_user` atributini o'rnatadi (yoki None). DRF view'lari shu atribut
orqali joriy foydalanuvchini oladi — eski Express `req.currentUser` bilan bir xil.
"""
from __future__ import annotations

import hmac
import logging
from typing import Callable

from django.core.cache import cache
from django.conf import settings
from django.http import Http404, HttpResponse

from .telegram_auth import TelegramUser, verify_init_data


logger = logging.getLogger(__name__)

_ADMIN_BRUTE_LIMIT = 5      # maksimal urinish soni
_ADMIN_BRUTE_WINDOW = 900   # 15 daqiqa (soniyada)


class AdminProtectionMiddleware:
    """Admin panelni himoya qiladi:
    1. ADMIN_ALLOWED_IPS sozlangan bo'lsa — faqat shu IP'lardan kirish ruxsati.
    2. Brute-force: 5 ta noto'g'ri logindan keyin 15 daqiqa blok.
    """

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request):
        admin_prefix = "/" + getattr(settings, "ADMIN_SECRET_PATH", "admin").strip("/") + "/"
        if not request.path.startswith(admin_prefix):
            return self.get_response(request)

        ip = self._get_ip(request)

        # 1. IP whitelist tekshiruvi
        allowed_ips = getattr(settings, "ADMIN_ALLOWED_IPS", [])
        if allowed_ips and ip not in allowed_ips:
            logger.warning("Admin: IP bloklandi: %s (whitelist'da yo'q)", ip)
            raise Http404

        # 2. Brute-force bloklash tekshiruvi
        block_key = f"admin_block:{ip}"
        if cache.get(block_key):
            logger.warning("Admin: IP vaqtinchalik bloklandi: %s", ip)
            return HttpResponse(
                "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
                status=429,
                content_type="text/plain",
            )

        response = self.get_response(request)

        # 3. Noto'g'ri login POST so'rovini kuzatish
        if request.method == "POST" and response.status_code in (200, 302):
            # Django admin login muvaffaqiyatsiz bo'lsa 200 (forma qayta ko'rsatiladi)
            # Muvaffaqiyatli bo'lsa 302 (dashboard'ga redirect)
            from django.contrib.auth import SESSION_KEY
            if not request.session.get(SESSION_KEY):
                self._record_fail(ip, block_key)
            else:
                cache.delete(f"admin_fails:{ip}")

        return response

    @staticmethod
    def _get_ip(request) -> str:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    @staticmethod
    def _record_fail(ip: str, block_key: str) -> None:
        fail_key = f"admin_fails:{ip}"
        fails = cache.get(fail_key, 0) + 1
        cache.set(fail_key, fails, _ADMIN_BRUTE_WINDOW)
        if fails >= _ADMIN_BRUTE_LIMIT:
            cache.set(block_key, True, _ADMIN_BRUTE_WINDOW)
            logger.warning(
                "Admin: IP %s %d ta noto'g'ri urinishdan so'ng bloklandi (%d soniya)",
                ip, fails, _ADMIN_BRUTE_WINDOW,
            )


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
        # BOT_INTERNAL_API_KEY o'rnatilmagan bo'lsa — bot auth ishlamaydi (401).
        # Bot tokeniga fallback YO'Q: bot tokeni log'larda ko'rinishi mumkin.
        if header.lower().startswith("bot "):
            provided_key = header[4:].strip()
            if not provided_key or not settings.ADMIN_TELEGRAM_IDS:
                return None

            internal_key = getattr(settings, "BOT_INTERNAL_API_KEY", "") or ""
            if not internal_key:
                # BOT_INTERNAL_API_KEY sozlanmagan — bot auth ishlamaydi.
                # Xavfsiz: bot tokeniga hech qachon fallback qilinmaydi.
                logger.error(
                    "Bot admin auth rad etildi: BOT_INTERNAL_API_KEY o'rnatilmagan. "
                    "Render env'ga BOT_INTERNAL_API_KEY qo'ying."
                )
                return None

            if hmac.compare_digest(provided_key, internal_key):
                # Bot ishtirokchi nomidan harakat qilsa: X-On-Behalf-Of: <telegram_id>
                # Bu faqat tasdiqlangan bot kaliti bilan ishlaydi — oddiy foydalanuvchi
                # o'z telegram_id'sini soxtalashtirolmaydi.
                on_behalf = request.headers.get("X-On-Behalf-Of") or request.headers.get("x-on-behalf-of")
                if on_behalf and on_behalf.lstrip("-").isdigit():
                    proxy_tid = int(on_behalf)
                    if proxy_tid > 0:
                        return TelegramUser(
                            telegram_id=proxy_tid,
                            first_name="BotProxy",
                            last_name=None,
                            username=None,
                        )
                return _bot_admin_user()

            return None

        prefix = "tma "
        if not header.lower().startswith(prefix):
            return None
        init_data = header[len(prefix):].strip()
        user = verify_init_data(init_data)

        # DEV bypass: guest auth + X-Dev-Tid header bo'lsa shu telegram_id
        # bilan ishlatamiz. Bu bir browser'dan ko'p tab orqali multi-player
        # test qilish imkonini beradi. Production'da o'tkazib yuboriladi.
        if user is not None and user.telegram_id == 0 and not getattr(settings, "IS_PRODUCTION", False):
            dev_tid_raw = request.headers.get("X-Dev-Tid") or request.headers.get("x-dev-tid")
            if dev_tid_raw and dev_tid_raw.lstrip("-").isdigit():
                dev_tid = int(dev_tid_raw)
                if dev_tid > 0:
                    # Demo user — telegram_id'ni almashtiramiz, ismni saqlaymiz.
                    user = TelegramUser(
                        telegram_id=dev_tid,
                        first_name=f"Dev{dev_tid}",
                        last_name=None,
                        username=f"dev_{dev_tid}",
                    )
                    logger.info("dev-tid bypass: guest -> telegram_id=%s", dev_tid)

        return user


def _bot_admin_user() -> TelegramUser:
    """Bot tomonidan chaqirilgan admin so'rovlari uchun synthetic admin user."""
    return TelegramUser(
        telegram_id=settings.ADMIN_TELEGRAM_IDS[0],
        first_name="Bot",
        last_name=None,
        username=None,
    )
