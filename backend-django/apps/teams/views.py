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

    if repositories.find_membership(user.telegram_id):
        raise AppError(409, "Siz allaqachon jamoadasiz")

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
