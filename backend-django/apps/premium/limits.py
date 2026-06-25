"""Premium limit tekshiruvi va hisoblagich.

Xavfsizlik printsipi:
  - PremiumSettings.enabled = False (default) → hech qanday cheklov yo'q.
  - Bo'lim limited=False → cheklov yo'q.
  - Foydalanuvchi premium aktiv → cheklov yo'q.
  - Cache xatosi → fail-open (gameplay buzilmaydi).

Chaqirish tartibi:
  check_and_consume(user, section)  → None yoki AppError(403, ...)
  get_usage(user)                   → dict: har bo'lim uchun used/limit/remaining/resetsAt
"""
from __future__ import annotations

import logging
from datetime import datetime, time, timedelta

from django.core.cache import cache
from django.utils import timezone

from apps.core.exceptions import AppError


logger = logging.getLogger(__name__)

VALID_SECTIONS = ("round", "daily", "battle", "svoyak", "gameroom")

# Bo'lim xato xabarlari (Uzbekcha, foydalanuvchiga ko'rinadi)
_SECTION_NAMES = {
    "round": "O'yin",
    "daily": "Kunlik topshiriq",
    "battle": "Bellashuv",
    "svoyak": "Svoyak",
    "gameroom": "O'yin xonasi",
}

# Kesh TTL: 26 soat — tungi yarim chegara kesib o'tsa ham bugungi limit
# ertasi kun yuklanmasligi uchun biroz ortiqcha ushlanadi.
_COUNTER_TTL = 26 * 60 * 60  # soniya


def _today_str() -> str:
    # Asia/Tashkent mahalliy sanasi (settings.TIME_ZONE) — kun yarim tunda yangilanadi.
    return timezone.localdate().isoformat()  # YYYY-MM-DD


def _cache_key(telegram_id: int, section: str) -> str:
    return f"premlimit:{telegram_id}:{section}:{_today_str()}"


def _resets_at_iso() -> str:
    """Limitni qayta tiklash vaqti — ertangi kun boshlanishi (mahalliy vaqt, yarim tun).

    Cache kalit `date.today()` (mahalliy) sana qatoridan foydalanadi, shuning uchun
    reset vaqti ham xuddi shu asos bilan mos kelishi zarur.
    Qaytariladi: ISO 8601 string, masalan "2025-06-24T00:00:00".
    """
    tomorrow = timezone.localdate() + timedelta(days=1)
    naive_midnight = datetime.combine(tomorrow, time.min)
    aware = timezone.make_aware(naive_midnight, timezone.get_current_timezone())
    return aware.isoformat()


def _get_settings():
    """PremiumSettings singleton — import'dan qochish uchun lazy."""
    from apps.users.models import PremiumSettings
    return PremiumSettings.get()


def check_and_consume(user, section: str) -> None:
    """Limitni tekshiradi va (agar kerak bo'lsa) 1 ta ishlatilgan deb belgilaydi.

    Qoidalar:
      1. enabled=False → hech narsa qilmaydi.
      2. Bo'lim limited=False → hech narsa qilmaydi.
      3. Foydalanuvchi premium aktiv → hech narsa qilmaydi.
      4. Bugungi foydalanish >= free_limit → AppError(403, ...) ko'taradi.
      5. Aks holda counter+1 va davom etadi.
    Cache xatosi → fail-open (gameplay buzilmaydi, warning log yoziladi).
    """
    try:
        settings = _get_settings()
    except Exception:
        logger.warning("premium.check_and_consume: settings yuklanmadi — fail-open", exc_info=True)
        return

    if not settings.enabled:
        return

    section_cfg = settings.get_section(section)
    if not section_cfg["limited"]:
        return

    # Premium foydalanuvchi — cheksiz
    if getattr(user, "is_premium_active", lambda: False)():
        return

    free_limit = section_cfg["free_limit"]
    # free_limit=0 → to'liq bloklangan bepul foydalanuvchilar uchun
    if free_limit == 0:
        section_label = _SECTION_NAMES.get(section, section)
        raise AppError(
            403,
            f"{section_label} uchun bepul foydalanuvchilar uchun mavjud emas. Premium oling.",
        )

    key = _cache_key(user.telegram_id, section)
    try:
        used = cache.get(key, 0)
        if used >= free_limit:
            section_label = _SECTION_NAMES.get(section, section)
            raise AppError(
                403,
                f"{section_label} uchun bugungi bepul limit tugadi ({used}/{free_limit}). Premium oling.",
            )
        # Counter'ni 1 ga oshiramiz; get_or_set pattern — race condition xavfsiz
        # (Django cache incr atomic emas barcha backendlarda, lekin bu erda
        # kichik farq muhim emas — limitni yangi yaratamiz yoki inkrement qilamiz)
        new_val = used + 1
        if used == 0:
            cache.set(key, new_val, _COUNTER_TTL)
        else:
            try:
                cache.incr(key)
            except ValueError:
                # incr qo'llab-quvvatlanmaydi — set bilan yozamiz
                cache.set(key, new_val, _COUNTER_TTL)
    except AppError:
        raise
    except Exception:
        # Cache xatosi → fail-open
        logger.warning(
            "premium.check_and_consume: cache xatosi user=%s section=%s — fail-open",
            getattr(user, "telegram_id", "?"),
            section,
            exc_info=True,
        )


def get_usage(user) -> dict:
    """Har bo'lim uchun bugungi foydalanish hisobotini qaytaradi.

    Qaytaradi: { section: { used, limit, remaining, limited, resetsAt } }
    Premium aktiv bo'lsa used=0, limit=null, remaining=null, limited=False, resetsAt=null.
    Cheklangan bo'lim uchun resetsAt = ertangi kun yarim tun (mahalliy vaqt, ISO 8601).
    """
    try:
        settings = _get_settings()
    except Exception:
        logger.warning("premium.get_usage: settings yuklanmadi", exc_info=True)
        return {sec: {"used": 0, "limit": None, "remaining": None, "limited": False, "resetsAt": None} for sec in VALID_SECTIONS}

    is_premium = getattr(user, "is_premium_active", lambda: False)()
    result = {}
    # Bir martagina hisoblaymiz — barcha bo'limlar uchun bir xil
    resets_at = _resets_at_iso()

    for section in VALID_SECTIONS:
        if not settings.enabled:
            result[section] = {"used": 0, "limit": None, "remaining": None, "limited": False, "resetsAt": None}
            continue

        section_cfg = settings.get_section(section)
        if not section_cfg["limited"] or is_premium:
            result[section] = {"used": 0, "limit": None, "remaining": None, "limited": False, "resetsAt": None}
            continue

        free_limit = section_cfg["free_limit"]
        key = _cache_key(user.telegram_id, section)
        try:
            used = int(cache.get(key, 0))
        except Exception:
            used = 0

        remaining = max(0, free_limit - used) if free_limit > 0 else 0
        result[section] = {
            "used": used,
            "limit": free_limit,
            "remaining": remaining,
            "limited": True,
            "resetsAt": resets_at,
        }

    return result
