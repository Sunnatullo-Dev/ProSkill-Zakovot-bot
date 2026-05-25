"""Umumiy rate-limit helper'lari.

`django-ratelimit` uchun `key=` parametriga beriladigan funksiyalar.
"""
from __future__ import annotations


def user_or_ip(group: str, request) -> str:
    """User-id bo'yicha (auth bo'lgan bo'lsa), aks holda IP bo'yicha.

    Mobil tarmoqlardagi ko'p foydalanuvchilar bitta IP'ni baham ko'rgan
    holatlarda bir-birini bloklab qo'ymasligi uchun — auth bo'lganlar
    o'z bucket'iga olinadi.
    """
    user = getattr(request, "current_user", None)
    if user and getattr(user, "telegram_id", 0) > 0:
        return f"u:{user.telegram_id}"
    return f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"
