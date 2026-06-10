"""Kanal API — public va autentifikatsiyalangan endpointlar."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin, require_auth
from . import repositories as repo


@api_view(["GET"])
def list_channels(request):
    """Aktiv majburiy kanallar ro'yxati.

    Auth shart emas — frontend dastlabki yuklashda ishlata olsin.
    """
    channels = repo.list_active_channels()
    return Response({"channels": channels})


@api_view(["GET"])
@require_auth
def check_subscriptions(request):
    """Hozirgi foydalanuvchining barcha kanalga obuna holatini tekshirish.

    Telegram Bot getChatMember API'ni chaqiradi. Natija:
        {
            "allSubscribed": bool,
            "channels": [...{channelTitle, channelUrl, subscribed}...]
        }
    """
    telegram_id = request.current_user.telegram_id
    result = repo.check_user_subscriptions(telegram_id)
    return Response(result)


@api_view(["GET"])
@require_admin
def bot_check_subscriptions(request, telegram_id: int):
    """Bot tomonidan chaqiriladigan endpoint — berilgan foydalanuvchi obunasini tekshirish.

    Auth: `Authorization: bot <BOT_INTERNAL_API_KEY>`
    """
    result = repo.check_user_subscriptions(telegram_id)
    return Response(result)
