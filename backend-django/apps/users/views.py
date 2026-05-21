"""Users API endpointlari — eski /api/users/* yo'llari bilan bir xil."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError

from . import repositories


@api_view(["GET"])
@require_auth
def get_top(request):
    limit = _parse_int(request.query_params.get("limit"), default=3, lo=1, hi=100)
    users = repositories.get_top_users(limit=limit)
    return Response({"users": users})


@api_view(["GET"])
@require_auth
def get_leaderboard(request):
    user = request.current_user
    users = repositories.get_top_users(limit=100)
    rank = repositories.get_user_rank(user.telegram_id)
    return Response({"users": users, "rank": rank})


@api_view(["GET"])
@require_auth
def get_referrals(request):
    user = request.current_user
    referrers = repositories.get_referral_leaderboard()
    my_count = repositories.get_referral_count(user.telegram_id)
    return Response({"referrers": referrers, "myCount": my_count})


def _parse_int(raw: str | None, *, default: int, lo: int, hi: int) -> int:
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise AppError(400, "Noto'g'ri raqam")
    return max(lo, min(hi, value))
