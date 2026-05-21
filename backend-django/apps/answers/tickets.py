"""HMAC-imzolangan javob biletlari.

Frontend bilan to'g'ri javobni almashish o'rniga, server faqat tiket
chiqaradi. Tiket savol id, vaqt va imzodan iborat; foydalanuvchi javob
yuborganda biz tiketni qaytadan tekshirib, savol va vaqtni qayta
tiklaymiz. Bu eski `backend/src/services/answerTicket.service.ts` ning
Python varianti.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import time
from dataclasses import dataclass

from django.conf import settings

from apps.core.exceptions import AppError


@dataclass(frozen=True)
class TicketPayload:
    question_id: str
    issued_at_ms: int


def issue_answer_ticket(question_id: str) -> str:
    issued_at = int(time.time() * 1000)
    body = f"{question_id}.{issued_at}"
    signed = f"{body}.{_sign(body)}"
    return _b64url_encode(signed.encode("utf-8"))


def verify_answer_ticket(ticket: str) -> TicketPayload:
    try:
        decoded = _b64url_decode(ticket).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise AppError(400, "Javob tiketi noto'g'ri")

    parts = decoded.split(".")
    if len(parts) != 3:
        raise AppError(400, "Javob tiketi noto'g'ri")

    question_id, issued_at_raw, signature = parts

    if not _signature_matches(f"{question_id}.{issued_at_raw}", signature):
        raise AppError(400, "Javob tiketi imzosi noto'g'ri")

    try:
        issued_at_ms = int(issued_at_raw)
    except ValueError:
        raise AppError(400, "Javob tiketi noto'g'ri")

    return TicketPayload(question_id=question_id, issued_at_ms=issued_at_ms)


def _sign(body: str) -> str:
    key = settings.TELEGRAM_BOT_TOKEN.encode("utf-8")
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
