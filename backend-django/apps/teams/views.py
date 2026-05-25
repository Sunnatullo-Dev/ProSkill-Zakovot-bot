"""Teams API endpointlari — /api/teams/*."""
from __future__ import annotations

import logging

from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError
from apps.core.ratelimit import user_or_ip

from . import repositories


logger = logging.getLogger(__name__)


def _broken_auth_error() -> AppError:
    return AppError(
        403,
        "Telegram bilan ulanish muvaffaqiyatsiz. Mini-app oynasini yopib, "
        "bot menyusi orqali qayta oching."
    )


@api_view(["POST"])
@require_auth
@ratelimit(key=user_or_ip, rate="10/m", block=True)
def create_team(request):
    user = request.current_user

    # Mehmon foydalanuvchi (telegram_id=0) jamoa yarata olmaydi — chunki
    # u barcha mehmonlar bilan baham ko'rinadi va shu jamoa hammasiga
    # ko'rinib qoladi (shared-guest leak). Bu yerga tushish — auth singan
    # belgi (frontend "guest" yuborgan), shuning uchun xato xabari amaliy bo'lsin.
    if user.telegram_id <= 0:
        raise _broken_auth_error()

    body = request.data if isinstance(request.data, dict) else {}
    name = (body.get("name") or "").strip()

    if len(name) < 2:
        raise AppError(400, "Jamoa nomi kamida 2 belgi")
    if len(name) > 30:
        raise AppError(400, "Jamoa nomi 30 belgidan oshmasin")

    if repositories.find_membership(user.telegram_id):
        raise AppError(409, "Siz allaqachon jamoadasiz")

    team = repositories.create_team(name, user.telegram_id)
    logger.info(
        "team_created",
        extra={"event": "team_created", "team_id": team["id"], "code": team["code"], "owner": user.telegram_id},
    )
    return Response({"team": team, "code": team["code"]}, status=201)


@api_view(["POST"])
@require_auth
@ratelimit(key=user_or_ip, rate="20/m", block=True)
def join_team(request):
    user = request.current_user

    # Mehmon (shared row) jamoaga qo'shila olmaydi — boshqalarni ham
    # avtomatik ham shu jamoaga qo'shgan bo'lar edi.
    if user.telegram_id <= 0:
        raise _broken_auth_error()

    body = request.data if isinstance(request.data, dict) else {}
    code = (body.get("code") or "").strip()

    if not (4 <= len(code) <= 8):
        raise AppError(400, "Kod noto'g'ri")

    membership = repositories.find_membership(user.telegram_id)
    if membership:
        existing = repositories.get_team_by_telegram_id(user.telegram_id)
        team_name = (existing or {}).get("name", "")
        if team_name:
            raise AppError(409, f"Siz allaqachon '{team_name}' jamoasidasiz. Avval u yerdan chiqing.")
        raise AppError(409, "Siz allaqachon jamoadasiz. Avval u yerdan chiqing.")

    team = repositories.join_team_by_code(code, user.telegram_id)
    logger.info(
        "team_joined",
        extra={"event": "team_joined", "team_id": team.get("id"), "by": user.telegram_id},
    )
    return Response({"team": team, "members": team.get("members", [])})


@api_view(["GET"])
@require_auth
def get_my_team(request):
    user = request.current_user

    # Mehmon uchun har doim "jamoasi yo'q" qaytaramiz — telegram_id=0
    # qatorida saqlangan team_member boshqalarga "leak" bo'lmasligi uchun.
    if user.telegram_id <= 0:
        return Response({"team": None})

    team = repositories.get_team_by_telegram_id(user.telegram_id)
    return Response({"team": team})


@api_view(["DELETE"])
@require_auth
@ratelimit(key=user_or_ip, rate="20/m", block=True)
def leave_team(request):
    user = request.current_user
    repositories.leave_team(user.telegram_id)
    logger.info(
        "team_left",
        extra={"event": "team_left", "by": user.telegram_id},
    )
    return Response({"ok": True})


@api_view(["GET"])
@require_auth
def get_team_chat(request):
    """Jamoa chat xabarlarini qaytaradi. Faqat a'zolar uchun."""
    user = request.current_user
    membership = repositories.find_membership(user.telegram_id)
    if not membership:
        raise AppError(403, "Siz jamoaga a'zo emassiz")

    messages = repositories.list_chat_messages(membership["team_id"])
    return Response({"messages": messages})


@api_view(["POST"])
@require_auth
@ratelimit(key=user_or_ip, rate="20/m", block=True)
def post_team_chat(request):
    """Yangi chat xabarini saqlaydi. Faqat a'zolar uchun."""
    user = request.current_user
    if user.telegram_id <= 0:
        raise AppError(403, "Mehmon chatda yoza olmaydi")

    membership = repositories.find_membership(user.telegram_id)
    if not membership:
        raise AppError(403, "Siz jamoaga a'zo emassiz")

    body = request.data if isinstance(request.data, dict) else {}
    text = (body.get("text") or "").strip()

    if not text:
        raise AppError(400, "Xabar bo'sh bo'lmasin")
    if len(text) > 500:
        raise AppError(400, "Xabar 500 belgidan oshmasin")

    msg = repositories.post_chat_message(membership["team_id"], user.telegram_id, text)
    return Response({"message": msg}, status=201)


@api_view(["POST"])
@require_auth
@ratelimit(key=user_or_ip, rate="10/m", block=True)
def transfer_team_owner(request):
    """Jamoa sardorligini boshqa a'zoga o'tkazadi.

    Body: {"newOwnerTelegramId": <int>}
    Tekshiruvlar:
    - Faqat mavjud sardor o'tkaza oladi
    - Yangi sardor shu jamoaning a'zosi bo'lishi kerak
    - O'ziga qaytadan o'tkaza olmaydi (no-op)
    """
    user = request.current_user
    if user.telegram_id <= 0:
        raise _broken_auth_error()

    body = request.data if isinstance(request.data, dict) else {}
    new_owner_raw = body.get("newOwnerTelegramId")

    try:
        new_owner_id = int(new_owner_raw)
    except (TypeError, ValueError):
        raise AppError(400, "newOwnerTelegramId noto'g'ri")

    if new_owner_id <= 0:
        raise AppError(400, "newOwnerTelegramId noto'g'ri")

    team = repositories.get_team_by_telegram_id(user.telegram_id)
    if not team:
        raise AppError(404, "Sizning jamoangiz yo'q")
    if team.get("ownerId") != user.telegram_id:
        raise AppError(403, "Faqat hozirgi sardor sardorlikni o'tkaza oladi")

    if new_owner_id == user.telegram_id:
        return Response({"team": team})  # no-op

    if not repositories.is_team_member(team["id"], new_owner_id):
        raise AppError(400, "Yangi sardor jamoaning a'zosi bo'lishi kerak")

    updated = repositories.transfer_owner(team["id"], new_owner_id)
    logger.info(
        "team_owner_transferred",
        extra={
            "event": "team_owner_transferred",
            "team_id": team["id"],
            "from": user.telegram_id,
            "to": new_owner_id,
        },
    )
    return Response({"team": updated})


@api_view(["PATCH"])
@require_auth
@ratelimit(key=user_or_ip, rate="10/m", block=True)
def rename_my_team(request):
    """Jamoa nomini o'zgartiradi. Faqat egasi qila oladi."""
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    name = (body.get("name") or "").strip()

    if len(name) < 2:
        raise AppError(400, "Jamoa nomi kamida 2 belgi")
    if len(name) > 30:
        raise AppError(400, "Jamoa nomi 30 belgidan oshmasin")

    team = repositories.get_team_by_telegram_id(user.telegram_id)
    if not team:
        raise AppError(404, "Sizning jamoangiz yo'q")
    if team.get("ownerId") != user.telegram_id:
        raise AppError(403, "Faqat jamoa egasi nomni o'zgartira oladi")

    updated = repositories.update_name(team["id"], name)
    logger.info(
        "team_renamed",
        extra={"event": "team_renamed", "team_id": team["id"], "by": user.telegram_id},
    )
    return Response({"team": updated})
