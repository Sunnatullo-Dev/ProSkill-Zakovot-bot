"""Battle API endpointlari — /api/battles/*."""
from __future__ import annotations

import re

from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError

from . import service


UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


def _validate_uuid(value: str) -> str:
    if not isinstance(value, str) or not UUID_RE.match(value):
        raise AppError(400, "Bellashuv ID noto'g'ri")
    return value


@api_view(["GET"])
@require_auth
def get_pending(request):
    user = request.current_user
    challenges = service.get_pending_for_user(user.telegram_id)
    return Response({"challenges": challenges})


@api_view(["POST"])
@require_auth
@ratelimit(key="ip", rate="10/m", block=True)
def challenge_opponent(request):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    opponent_code = (body.get("opponent_code") or "").strip()

    if not (4 <= len(opponent_code) <= 8):
        raise AppError(400, "Kod noto'g'ri")

    battle = service.challenge(user.telegram_id, opponent_code)
    return Response({"battleId": battle["id"]}, status=201)


@api_view(["POST"])
@require_auth
def accept_challenge(request, battle_id: str):
    user = request.current_user
    battle_id = _validate_uuid(battle_id)
    service.accept_challenge(battle_id, user.telegram_id)
    return Response({"ok": True, "battleId": battle_id})


@api_view(["POST"])
@require_auth
def decline_challenge(request, battle_id: str):
    user = request.current_user
    battle_id = _validate_uuid(battle_id)
    service.decline_challenge(battle_id, user.telegram_id)
    return Response({"ok": True})


@api_view(["POST"])
@require_auth
def cancel_challenge(request, battle_id: str):
    user = request.current_user
    battle_id = _validate_uuid(battle_id)
    service.cancel_challenge(battle_id, user.telegram_id)
    return Response({"ok": True})


@api_view(["POST"])
@require_auth
def submit_answer(request, battle_id: str):
    user = request.current_user
    battle_id = _validate_uuid(battle_id)
    body = request.data if isinstance(request.data, dict) else {}

    round_id_raw = body.get("roundId")
    answer_raw = body.get("answer", "")

    round_id = _validate_uuid(round_id_raw) if isinstance(round_id_raw, str) else None
    if not round_id:
        raise AppError(400, "Round ID noto'g'ri")
    if not isinstance(answer_raw, str):
        answer_raw = ""

    result = service.process_answer(battle_id, user.telegram_id, round_id, answer_raw)
    return Response(result)


@api_view(["GET"])
@require_auth
def get_state(request, battle_id: str):
    user = request.current_user
    battle_id = _validate_uuid(battle_id)
    state = service.get_battle_state(battle_id, user.telegram_id)
    return Response(state)


@api_view(["POST"])
@require_auth
def forfeit_battle_view(request, battle_id: str):
    user = request.current_user
    battle_id = _validate_uuid(battle_id)
    service.forfeit_battle(battle_id, user.telegram_id)
    return Response({"ok": True})
