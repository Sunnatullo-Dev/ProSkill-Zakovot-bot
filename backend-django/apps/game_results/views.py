from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError

from . import repositories


@api_view(["POST"])
@require_auth
def save_result(request):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    correct = _coerce_int(body.get("correctCount"))
    total = _coerce_int(body.get("totalCount"))
    round_score = _coerce_int(body.get("roundScore"))

    if correct < 0 or total < 0 or round_score < 0:
        raise AppError(400, "Manfiy qiymat berib bo'lmaydi")
    if total < 1:
        raise AppError(400, "totalCount kamida 1 bo'lishi kerak")
    if correct > total:
        raise AppError(400, "correctCount totalCount dan katta bo'la olmaydi")
    # Max 3 ball/savol (tez + streak bonus). Bundan yuqori — cheating.
    if round_score > total * 3:
        raise AppError(400, "roundScore mumkin bo'lgan maksimaldan oshib ketdi")

    repositories.create_game_result(user.telegram_id, correct, total, round_score)
    return Response({"ok": True}, status=201)


@api_view(["GET"])
@require_auth
def get_stats(request):
    user = request.current_user
    return Response({"stats": repositories.get_stats(user.telegram_id)})


@api_view(["GET"])
@require_auth
def get_history(request):
    user = request.current_user
    limit = min(50, max(1, int(request.query_params.get("limit", 20))))
    results = repositories.get_history(user.telegram_id, limit=limit)
    return Response({"results": results})


def _coerce_int(raw) -> int:
    if raw is None:
        raise AppError(400, "Maydon to'ldirilishi shart")
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise AppError(400, "Raqam kutilgan")
