"""Telegram orqali xabar yuborish — `telegramNotifier.service.ts` ning Python varianti.

Bellashuv yaratilganda, qabul qilinganda va h.k. boshqa a'zolarga DM yuborish uchun
ishlatamiz. `send_message_async` `threading.Thread` ichida ishlaydi — DRF view tezda
javob qaytarishi mumkin, xabarlar fonda yuboriladi.
"""
from __future__ import annotations

import threading
from typing import Any

import requests
from django.conf import settings


_REQUEST_TIMEOUT = 10


def _mini_app_keyboard() -> dict[str, Any] | None:
    url = getattr(settings, "MINI_APP_URL", None) or ""
    if not url.startswith("https://"):
        return None
    return {
        "inline_keyboard": [[{"text": "\U0001F9E0 Mini Appni ochish", "web_app": {"url": url}}]]
    }


def send_message_sync(chat_id: int, text: str, *, with_mini_app_button: bool = True) -> None:
    if chat_id <= 0:
        return
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return

    body: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    if with_mini_app_button:
        keyboard = _mini_app_keyboard()
        if keyboard:
            body["reply_markup"] = keyboard

    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json=body,
            timeout=_REQUEST_TIMEOUT,
        )
        if not response.ok:
            print(f"[telegram] sendMessage failed chat={chat_id} status={response.status_code}: {response.text[:200]}")
    except requests.RequestException as error:
        print(f"[telegram] sendMessage error chat={chat_id}: {error}")


def send_message(chat_id: int, text: str, *, with_mini_app_button: bool = True) -> None:
    """Fonda yuboriladi — view tezda qaytadi."""
    threading.Thread(
        target=send_message_sync,
        args=(chat_id, text),
        kwargs={"with_mini_app_button": with_mini_app_button},
        daemon=True,
    ).start()


def notify_members(member_ids: list[int], text: str) -> None:
    unique = {mid for mid in member_ids if isinstance(mid, int) and mid > 0}
    for chat_id in unique:
        send_message(chat_id, text)


def escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
