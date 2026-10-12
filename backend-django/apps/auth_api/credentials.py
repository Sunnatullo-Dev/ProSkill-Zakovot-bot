"""Telefon raqami normalizatsiyasi va parol siyosati.

Loyihaning asosiy auditoriyasi — O'zbekiston, shuning uchun `+998` raqamlari
uchun qulay qisqa formatlar ham qabul qilinadi va E.164 ga keltiriladi.
"""
from __future__ import annotations

import re

from apps.core.exceptions import AppError


# E.164: + va 8..15 ta raqam
_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
_DIGITS_RE = re.compile(r"\D")

UZ_COUNTRY_CODE = "998"
UZ_NATIONAL_LENGTH = 9  # 90 123 45 67

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

DISPLAY_NAME_MAX = 30


def normalize_phone(raw: object) -> str:
    """Telefon raqamini E.164 formatiga keltiradi.

    Qabul qilinadigan ko'rinishlar (barchasi `+998901234567` ga aylanadi)::

        +998 90 123 45 67
        998901234567
        901234567
        (90) 123-45-67
        8 90 123 45 67      → 998901234567 ga aylanmaydi (quyida izoh)

    Xato bo'lsa `AppError(400, ...)` ko'taradi.
    """
    if not isinstance(raw, str):
        raise AppError(400, "Telefon raqami matn bo'lishi kerak")

    value = raw.strip()
    if not value:
        raise AppError(400, "Telefon raqamini kiriting")

    had_plus = value.startswith("+")
    digits = _DIGITS_RE.sub("", value)

    if not digits:
        raise AppError(400, "Telefon raqami noto'g'ri")

    if not had_plus:
        # Faqat milliy raqam kiritilgan: 901234567 → 998901234567
        if len(digits) == UZ_NATIONAL_LENGTH:
            digits = UZ_COUNTRY_CODE + digits
        # 0 bilan boshlangan milliy format: 0901234567
        elif len(digits) == UZ_NATIONAL_LENGTH + 1 and digits.startswith("0"):
            digits = UZ_COUNTRY_CODE + digits[1:]

    candidate = "+" + digits

    if not _E164_RE.match(candidate):
        raise AppError(
            400,
            "Telefon raqami noto'g'ri. Namuna: +998 90 123 45 67",
        )

    return candidate


def validate_password(raw: object) -> str:
    """Parol siyosatini tekshiradi.

    Qoidalar:
      - 8..128 belgi
      - kamida bitta harf va bitta raqam
      - faqat bo'shliqdan iborat bo'lmasin

    Qasddan MURAKKAB emas: maxsus belgi talab qilinmaydi — bu foydalanuvchini
    zaif, yodda qoladigan naqshlarga majburlaydi. Uzunlik muhimroq.
    """
    if not isinstance(raw, str):
        raise AppError(400, "Parol matn bo'lishi kerak")

    if len(raw) < PASSWORD_MIN_LENGTH:
        raise AppError(400, f"Parol kamida {PASSWORD_MIN_LENGTH} ta belgidan iborat bo'lsin")
    if len(raw) > PASSWORD_MAX_LENGTH:
        raise AppError(400, f"Parol {PASSWORD_MAX_LENGTH} ta belgidan oshmasin")
    if not raw.strip():
        raise AppError(400, "Parol bo'sh bo'lmasin")
    if not re.search(r"[A-Za-zЀ-ӿ]", raw):
        raise AppError(400, "Parolda kamida bitta harf bo'lsin")
    if not re.search(r"\d", raw):
        raise AppError(400, "Parolda kamida bitta raqam bo'lsin")

    return raw


def validate_display_name(raw: object, *, field: str = "Ism") -> str:
    if not isinstance(raw, str):
        raise AppError(400, f"{field} matn bo'lishi kerak")
    value = raw.strip()
    if not value:
        raise AppError(400, f"{field}ni kiriting")
    if len(value) > DISPLAY_NAME_MAX:
        raise AppError(400, f"{field} {DISPLAY_NAME_MAX} belgidan oshmasin")
    return value


def mask_phone(phone: str | None) -> str:
    """Loglar uchun: `+998901234567` → `+9989****567`."""
    if not phone or len(phone) < 8:
        return "***"
    return f"{phone[:5]}****{phone[-3:]}"
