"""Answer API endpointlari — /api/answer/*.

POST /ticket  → savol uchun imzolangan bilet chiqaradi
POST /        → biletni tekshirib, javobni baholaydi va ball beradi
POST /reveal  → "Javobni bilmayman" tugmasi uchun to'g'ri javob va izoh
"""
from __future__ import annotations

import time

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError
from apps.questions.repositories import get_question_by_id
from apps.users.repositories import add_score

from .gemini import check_answer, explain_question
from .scoring import ScoreInput, calculate_answer_score
from .tickets import issue_answer_ticket, verify_answer_ticket


ANSWER_TIMEOUT_MS = 15_000
TIMEOUT_GRACE_MS = 2_000
UUID_RE = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"


@api_view(["POST"])
@require_auth
def issue_ticket(request):
    body = request.data if isinstance(request.data, dict) else {}
    question_id = body.get("questionId")

    if not isinstance(question_id, str) or not _looks_like_uuid(question_id):
        raise AppError(400, "questionId noto'g'ri")

    return Response({"ticket": issue_answer_ticket(question_id)})


@api_view(["POST"])
@require_auth
def submit_answer(request):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    ticket = body.get("ticket")
    if not isinstance(ticket, str) or not ticket:
        raise AppError(400, "ticket talab qilinadi")

    user_answer_raw = body.get("userAnswer", "")
    if not isinstance(user_answer_raw, str):
        user_answer_raw = ""
    user_answer = user_answer_raw.strip()

    streak_raw = body.get("streak", 0)
    try:
        streak_before = max(0, int(streak_raw))
    except (TypeError, ValueError):
        raise AppError(400, "streak noto'g'ri")

    payload = verify_answer_ticket(ticket)
    question = get_question_by_id(payload.question_id)
    if not question:
        raise AppError(404, "Question not found")

    now_ms = int(time.time() * 1000)
    time_taken = max(0, now_ms - payload.issued_at_ms)

    if time_taken > ANSWER_TIMEOUT_MS + TIMEOUT_GRACE_MS:
        return Response(
            {
                "status": "incorrect",
                "isCorrect": False,
                "explanation": "Vaqt tugadi",
                "correctAnswer": question["correctAnswer"],
                "pointsEarned": 0,
                "streak": 0,
            }
        )

    grading = check_answer(question["text"], question["correctAnswer"], user_answer)
    score = calculate_answer_score(
        ScoreInput(
            status=grading.status,
            time_taken_ms=min(time_taken, ANSWER_TIMEOUT_MS),
            streak_before=streak_before,
        )
    )

    if score.points_earned > 0:
        add_score(user.telegram_id, score.points_earned)

    return Response(
        {
            "status": grading.status,
            "isCorrect": grading.status == "correct",
            "explanation": grading.explanation,
            "correctAnswer": question["correctAnswer"],
            "pointsEarned": score.points_earned,
            "streak": score.streak_after,
        }
    )


@api_view(["POST"])
@require_auth
def reveal_answer(request):
    body = request.data if isinstance(request.data, dict) else {}
    ticket = body.get("ticket")
    if not isinstance(ticket, str) or not ticket:
        raise AppError(400, "ticket talab qilinadi")

    payload = verify_answer_ticket(ticket)
    question = get_question_by_id(payload.question_id)
    if not question:
        raise AppError(404, "Question not found")

    explanation = explain_question(question["text"], question["correctAnswer"])
    return Response({"correctAnswer": question["correctAnswer"], "explanation": explanation})


def _looks_like_uuid(value: str) -> bool:
    import re
    return re.match(UUID_RE, value) is not None
