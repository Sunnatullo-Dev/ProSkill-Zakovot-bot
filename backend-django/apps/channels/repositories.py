"""Kanal boshqaruvi va Telegram obuna tekshiruvi."""
from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

from apps.users.models import User
from .models import RequiredChannel

logger = logging.getLogger(__name__)


# ── CRUD ─────────────────────────────────────────────────────────────────────

def list_active_channels() -> list[dict]:
    """Aktiv majburiy kanallar ro'yxati (frontend gate uchun)."""
    return [ch.to_dict() for ch in RequiredChannel.objects.filter(is_active=True)]


def list_all_channels() -> list[dict]:
    """Admin uchun barcha kanallar (aktiv + o'chirilgan)."""
    return [ch.to_dict() for ch in RequiredChannel.objects.all()]


def add_channel(
    *,
    channel_id: str,
    channel_username: str,
    channel_title: str,
    channel_url: str,
    added_by_telegram_id: int | None = None,
    added_by_name: str = "",
) -> dict:
    """Yangi kanal qo'shish. Kaytarilgan dict to_dict() formatida."""
    ch = RequiredChannel.objects.create(
        channel_id=channel_id,
        channel_username=channel_username,
        channel_title=channel_title,
        channel_url=channel_url,
        added_by_telegram_id=added_by_telegram_id,
        added_by_name=added_by_name,
        is_active=True,
    )
    logger.info(
        "required_channel_added",
        extra={
            "event": "required_channel_added",
            "channel_id": channel_id,
            "channel_title": channel_title,
            "by": added_by_telegram_id,
        },
    )
    return ch.to_dict()


def deactivate_channel(pk: int) -> bool:
    """Kanalni o'chirish — soft delete (is_active=False)."""
    updated = RequiredChannel.objects.filter(id=pk).update(is_active=False)
    return updated > 0


def activate_channel(pk: int) -> bool:
    """O'chirilgan kanalni qayta faollashtirish."""
    updated = RequiredChannel.objects.filter(id=pk).update(is_active=True)
    return updated > 0


def delete_channel(pk: int) -> bool:
    """Kanalni butunlay o'chirish (hard delete) — tarix yo'qoladi."""
    deleted, _ = RequiredChannel.objects.filter(id=pk).delete()
    return deleted > 0


# ── Telegram Bot API ─────────────────────────────────────────────────────────

def verify_channel_exists(username: str) -> tuple[bool | None, dict]:
    """Telegram getChat API orqali kanal mavjudligini tekshiradi.

    Returns::

        (True,  {"numericId": str, "title": str, "url": str})
            — kanal topildi (numeric ID va sarlavha)
        (False, {})
            — kanal aniq topilmadi (Telegram 400/404 qaytardi)
        (None,  {})
            — tekshirib bo'lmadi (bot token yo'q yoki tarmoq xatosi)
    """
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        logger.warning("verify_channel: TELEGRAM_BOT_TOKEN yo'q, tekshirilmadi")
        return (None, {})

    chat_id = f"@{username}" if not username.startswith("@") else username
    url = f"https://api.telegram.org/bot{bot_token}/getChat"
    params = urllib.parse.urlencode({"chat_id": chat_id})

    try:
        with urllib.request.urlopen(f"{url}?{params}", timeout=8) as resp:
            data = json.loads(resp.read())
    except Exception as exc:  # noqa: BLE001
        logger.warning("getChat tarmoq xatosi: %s | username=%s", exc, username)
        return (None, {})

    if not data.get("ok"):
        err = data.get("description", "")
        logger.info("getChat not ok: %s | username=%s", err, username)
        return (False, {})

    result = data["result"]
    numeric_id = str(result.get("id", chat_id))
    title = result.get("title", "")
    # Invite link yoki t.me/ havolasi
    url_val = (
        result.get("invite_link")
        or (f"https://t.me/{result.get('username')}" if result.get("username") else f"https://t.me/{username}")
    )
    return (True, {
        "numericId": numeric_id,
        "title": title,
        "username": result.get("username", username),
        "url": url_val,
    })


def _check_one_channel(telegram_user_id: int, channel_id: str) -> bool:
    """Foydalanuvchi bitta kanalga obuna bo'lganligini tekshirish.

    Telegram getChatMember API'dan foydalanadi. Bot kanal a'zosi yoki
    admin bo'lishi kerak (public kanallarda bot a'zo bo'lmasa ham ishlaydi
    lekin ba'zi hollarda xato berishi mumkin).

    Agar bot token yo'q yoki xato bo'lsa — False qaytaradi. Majburiy kanal
    access gate bo'lgani uchun tekshiruv xatosida fail-closed ishlatamiz.
    """
    bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        logger.warning("check_channel: TELEGRAM_BOT_TOKEN yo'q, tekshirilmadi")
        return False

    url = "https://api.telegram.org/bot{}/getChatMember".format(bot_token)
    params = urllib.parse.urlencode({
        "chat_id": channel_id,
        "user_id": str(telegram_user_id),
    })
    try:
        with urllib.request.urlopen(f"{url}?{params}", timeout=6) as resp:
            data = json.loads(resp.read())
        if not data.get("ok"):
            # Telegram xatosi — kanal topilmadimi yoki bot a'zo emasmi
            err = data.get("description", "")
            logger.warning("getChatMember not ok: %s | channel=%s", err, channel_id)
            return False
        status = data["result"].get("status", "left")
        return status in ("member", "administrator", "creator")
    except Exception as exc:  # noqa: BLE001
        logger.warning("getChatMember xato: %s | channel=%s", exc, channel_id)
        return False


def check_user_subscriptions(telegram_user_id: int) -> dict:
    """Foydalanuvchining barcha aktiv kanallarga obuna holatini tekshirish.

    Agar hammasi obuna bo'lgan bo'lsa — har kanal uchun passed_users ga
    foydalanuvchini qo'shadi (M2M, takrorlanmaydi).

    Returns::

        {
            "allSubscribed": bool,
            "channels": [
                {
                    "id": int,
                    "channelId": str,
                    "channelTitle": str,
                    "channelUrl": str,
                    "subscribed": bool,
                },
                ...
            ]
        }
    """
    channels = list(RequiredChannel.objects.filter(is_active=True))
    if not channels:
        return {"allSubscribed": True, "channels": []}

    results = []
    all_ok = True

    for ch in channels:
        subscribed = _check_one_channel(telegram_user_id, ch.channel_id)
        if not subscribed:
            all_ok = False
        results.append({
            "id": ch.id,
            "channelId": ch.channel_id,
            "channelTitle": ch.channel_title,
            "channelUrl": ch.channel_url,
            "subscribed": subscribed,
        })

    if all_ok:
        try:
            user = User.objects.get(telegram_id=telegram_user_id)
            for ch in channels:
                ch.passed_users.add(user)
        except User.DoesNotExist:
            logger.warning(
                "check_subscriptions: user not found | telegram_id=%s",
                telegram_user_id,
            )

    return {"allSubscribed": all_ok, "channels": results}
