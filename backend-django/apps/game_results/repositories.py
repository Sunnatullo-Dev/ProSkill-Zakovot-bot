from __future__ import annotations

from typing import Any

from apps.core.exceptions import AppError

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
    rows = list(GameResult.objects.filter(telegram_id=telegram_id))

    games_played = len(rows)
    total_correct = sum(r.correct_count for r in rows)
    total_questions = sum(r.total_count for r in rows)
    best_round_score = max((r.round_score for r in rows), default=0)
    accuracy = round((total_correct / total_questions) * 100) if total_questions > 0 else 0

    return {
        "gamesPlayed": games_played,
        "accuracy": accuracy,
        "bestRoundScore": best_round_score,
        "totalCorrect": total_correct,
    }


def count_all() -> int:
    return GameResult.objects.count()
