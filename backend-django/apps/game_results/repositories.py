"""Game results jadval repositoriy."""
from __future__ import annotations

from typing import Any

from apps.core.exceptions import AppError
from apps.core.supabase_client import table


COLUMNS = "id, telegram_id, correct_count, total_count, round_score, created_at"


def create_game_result(telegram_id: int, correct_count: int, total_count: int, round_score: int) -> None:
    result = (
        table("game_results")
        .insert(
            {
                "telegram_id": telegram_id,
                "correct_count": correct_count,
                "total_count": total_count,
                "round_score": round_score,
            }
        )
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Game result yozib bo'lmadi")


def get_stats(telegram_id: int) -> dict[str, Any]:
    result = (
        table("game_results")
        .select(COLUMNS)
        .eq("telegram_id", telegram_id)
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Game stats lookup failed")

    rows = result["data"] or []

    games_played = len(rows)
    total_correct = sum(int(row.get("correct_count") or 0) for row in rows)
    total_questions = sum(int(row.get("total_count") or 0) for row in rows)
    best_round_score = max((int(row.get("round_score") or 0) for row in rows), default=0)

    accuracy = round((total_correct / total_questions) * 100) if total_questions > 0 else 0

    return {
        "gamesPlayed": games_played,
        "accuracy": accuracy,
        "bestRoundScore": best_round_score,
        "totalCorrect": total_correct,
    }


def count_all() -> int:
    result = table("game_results").select("id").with_count("exact").execute()
    if result["error"]:
        raise AppError(500, "Game results count failed")
    return result["count"] or 0
