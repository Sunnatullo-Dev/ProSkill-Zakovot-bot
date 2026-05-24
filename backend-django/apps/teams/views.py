"""Teams API endpointlari — /api/teams/*."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError

from . import repositories


@api_view(["POST"])
@require_auth
def create_team(request):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    name = (body.get("name") or "").strip()

    if len(name) < 2:
        raise AppError(400, "Jamoa nomi kamida 2 belgi")
    if len(name) > 30:
        raise AppError(400, "Jamoa nomi 30 belgidan oshmasin")

    if repositories.find_membership(user.telegram_id):
        raise AppError(409, "Siz allaqachon jamoadasiz")

    team = repositories.create_team(name, user.telegram_id)
    return Response({"team": team, "code": team["code"]}, status=201)


@api_view(["POST"])
@require_auth
def join_team(request):
    user = request.current_user
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
    return Response({"team": team, "members": team.get("members", [])})


@api_view(["GET"])
@require_auth
def get_my_team(request):
    user = request.current_user
    team = repositories.get_team_by_telegram_id(user.telegram_id)
    return Response({"team": team})


@api_view(["DELETE"])
@require_auth
def leave_team(request):
    user = request.current_user
    repositories.leave_team(user.telegram_id)
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


@api_view(["PATCH"])
@require_auth
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
    return Response({"team": updated})
