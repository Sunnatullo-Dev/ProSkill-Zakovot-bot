"""Questions API endpointlari."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin, require_auth
from apps.core.exceptions import AppError

from . import repositories


DEFAULT_ROUND_COUNT = 10
MAX_ROUND_COUNT = 20
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


@api_view(["GET"])
@require_auth
def get_round(request):
    count = _parse_int(request.query_params.get("count"), default=DEFAULT_ROUND_COUNT, lo=1, hi=MAX_ROUND_COUNT)
    category = (request.query_params.get("category") or "").strip() or None
    difficulty = (request.query_params.get("difficulty") or "").strip() or None
    if difficulty and difficulty not in VALID_DIFFICULTIES:
        raise AppError(400, "Noto'g'ri qiyinlik darajasi")

    questions = repositories.get_round_questions(count=count, category=category, difficulty=difficulty)
    return Response({"questions": questions})


@api_view(["GET"])
@require_auth
def get_categories(request):
    categories = repositories.get_categories()
    return Response({"categories": categories})


@api_view(["POST"])
@require_auth
def report_question(request, question_id: str):
    user = request.current_user
    repositories.report_question(question_id, user.telegram_id)
    return Response({"ok": True}, status=201)


@api_view(["GET"])
@require_admin
def get_reported_questions(request):
    return Response({"questions": repositories.get_reported_questions()})


@api_view(["DELETE"])
@require_admin
def delete_question(request, question_id: str):
    repositories.delete_question(question_id)
    return Response({"ok": True})


def _parse_int(raw: str | None, *, default: int, lo: int, hi: int) -> int:
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise AppError(400, "Noto'g'ri raqam")
    return max(lo, min(hi, value))
