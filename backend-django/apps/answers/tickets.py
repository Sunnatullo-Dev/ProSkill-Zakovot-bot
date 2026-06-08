"""HMAC-imzolangan, single-use javob biletlari.

Tiket = `questionId.issuedAtMs.jti.HMAC` (base64url).

- `jti` (UUID) har biletga noyob — qaytadan ishlatib bo'lmaydi
- Submit'da `jti` cache'ga "consumed" deb yoziladi; takror urinishlar 409
- HMAC kalit `settings.TICKET_HMAC_SECRET` bilan imzolanadi (alohida,
  bot tokeni emas — rotatsiya va xavfsizlik domenlari ajratilgan)

Replay attack himoyasi: bitta bilet bilan turli vaqtlarda bir nechta javob
yuborish va ko'p ball ham olib bo'lmaydi.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import time
import uuid
from dataclasses import dataclass

from django.conf import settings
from django.core.cache import cache

from apps.core.exceptions import AppError


CONSUMED_TTL_SECONDS = 180  # max savol vaqti 120s + grace 2s + marja


@dataclass(frozen=True)
class TicketPayload:
    question_id: str
    issued_at_ms: int
    jti: str


def issue_answer_ticket(question_id: str) -> str:
    """Yangi single-use bilet chiqaradi."""
    issued_at = int(time.time() * 1000)
    jti = uuid.uuid4().hex
    body = f"{question_id}.{issued_at}.{jti}"
    signed = f"{body}.{_sign(body)}"
    return _b64url_encode(signed.encode("utf-8"))


def verify_answer_ticket(ticket: str) -> TicketPayload:
    """Bilet imzosini va formatini tekshiradi; consumed bo'lmasa ham qabul qiladi."""
    try:
        decoded = _b64url_decode(ticket).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise AppError(400, "Javob tiketi noto'g'ri")

    parts = decoded.split(".")
    if len(parts) != 4:
        raise AppError(400, "Javob tiketi noto'g'ri")

    question_id, issued_at_raw, jti, signature = parts

    if not _signature_matches(f"{question_id}.{issued_at_raw}.{jti}", signature):
        raise AppError(400, "Javob tiketi imzosi noto'g'ri")

    try:
        issued_at_ms = int(issued_at_raw)
    except ValueError:
        raise AppError(400, "Javob tiketi noto'g'ri")

    return TicketPayload(question_id=question_id, issued_at_ms=issued_at_ms, jti=jti)


def consume_answer_ticket(jti: str) -> bool:
    """Biletni "ishlatilgan" deb belgilashga urinadi.

    Atomik: cache'da hali yo'q bo'lsa True qaytaradi va belgilaydi;
    allaqachon bor bo'lsa False qaytaradi (replay urinish).
    """
    key = f"used_ticket:{jti}"
    # `cache.add` faqat key mavjud bo'lmaganda yozadi va True qaytaradi.
    return bool(cache.add(key, "1", timeout=CONSUMED_TTL_SECONDS))


def _sign(body: str) -> str:
    secret = getattr(settings, "TICKET_HMAC_SECRET", "") or ""
    if not secret:
        # Bo'sh kalit bilan imzolash zaif HMAC chiqaradi va ticket'larni
        # forge qilish mumkin bo'lib qoladi. Settings allaqachon production'da
        # ImproperlyConfigured raise qiladi; dev'da ham bu yerga tushmaslik kerak.
        raise RuntimeError("TICKET_HMAC_SECRET o'rnatilmagan — ticket'lar imzolanmaydi")
    key = secret.encode("utf-8")
    digest = hmac.new(key, body.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest


def _signature_matches(body: str, signature: str) -> bool:
    expected = _sign(body)
    try:
        return hmac.compare_digest(expected, signature)
    except (TypeError, ValueError):
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
