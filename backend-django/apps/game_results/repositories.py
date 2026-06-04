from __future__ import annotations

from typing import Any

from django.db.models import Count, Max, Sum

from .models import GameResult


def create_game_result(
    telegram_id: int,
    correct_count: int,
    total_count: int,
    round_score: int,
) -> None:
    GameResult.objects.create(
        telegram_id=telegram_id,
        correct_count=correct_count,
        total_count=total_count,
        round_score=round_score,
    )


def get_stats(telegram_id: int) -> dict[str, Any]:
    # Barcha qatorlarni xotiraga yuklamasdan, bitta DB aggregate so'rovi bilan
    # hisoblash — faol foydalanuvchilar uchun xotira va tezlik muammosini hal qiladi.
    agg = GameResult.objects.filter(telegram_id=telegram_id).aggregate(
        games_played=Count("id"),
        total_correct=Sum("correct_count"),
        total_questions=Sum("total_count"),
        best_round_score=Max("round_score"),
    )

    games_played = agg["games_played"] or 0
    total_correct = agg["total_correct"] or 0
    total_questions = agg["total_questions"] or 0
    best_round_score = agg["best_round_score"] or 0
    accuracy = round((total_correct / total_questions) * 100) if total_questions > 0 else 0

    return {
        "gamesPlayed": games_played,
        "accuracy": accuracy,
        "bestRoundScore": best_round_score,
        "totalCorrect": total_correct,
    }


def count_all() -> int:
    return GameResult.objects.count()


def get_history(telegram_id: int, limit: int = 20) -> list[dict]:
    results = (
        GameResult.objects.filter(telegram_id=telegram_id)
        .order_by("-created_at")[:limit]
    )
    output = []
    for r in results:
        accuracy = round(r.correct_count / r.total_count * 100) if r.total_count > 0 else 0
        output.append({
            "id": str(r.id),
            "correctCount": r.correct_count,
            "totalCount": r.total_count,
            "roundScore": r.round_score,
            "accuracy": accuracy,
            "createdAt": r.created_at.isoformat(),
        })
    return output
