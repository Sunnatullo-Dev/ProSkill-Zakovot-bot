"""Kunlik topshiriq API — /api/daily/*."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError
from apps.questions.repositories import get_questions_by_ids

from . import repositories


@api_view(["GET"])
@require_auth
def get_today(request):
    user = request.current_user
    challenge = repositories.get_or_create_today()
    completed = repositories.has_completed_today(user.telegram_id)
    streak = repositories.get_user_streak(user.telegram_id)
    questions = get_questions_by_ids(challenge.question_ids)
    bonus_preview = repositories.get_streak_bonus(streak["current"] + 1) if not completed else 0

    return Response({
        "date": challenge.date.isoformat(),
        "questions": questions,
        "completed": completed,
        "streak": streak,
        "bonusPreview": bonus_preview,
    })


@api_view(["POST"])
@require_auth
def complete(request):
    user = request.current_user
    if user.telegram_id <= 0:
        raise AppError(403, "Mehmon foydalanuvchi kunlik topshiriq bajarishi mumkin emas")

    body = request.data if isinstance(request.data, dict) else {}
    try:
        correct_count = max(0, int(body.get("correctCount", 0)))
        score_earned = max(0, int(body.get("scoreEarned", 0)))
    except (TypeError, ValueError):
        raise AppError(400, "correctCount va scoreEarned raqam bo'lishi kerak")

    result = repositories.complete_daily(user.telegram_id, correct_count, score_earned)
    return Response(result, status=201)
