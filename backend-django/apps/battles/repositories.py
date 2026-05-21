"""Battle jadval repositoriy qatlami — eski `battle.repository.ts` ning Python varianti.

Eng muhimi: `try_*` atomik helperlari WHERE shartiga mos qatorni yangilaydi va
yangilangan qatorlar soni > 0 bo'lsa "g'olib" hisoblanadi. Bu polling vaqtidagi
race condition'lardan saqlaydi (advance, finalize, accept double-tap, va h.k.).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from apps.core.exceptions import AppError
from apps.core.supabase_client import table


CHALLENGE_COLUMNS = (
    "id, challenger_team_id, opponent_team_id, status, current_round_number, "
    "created_at, started_at, finished_at"
)
ROUND_COLUMNS = "id, battle_id, question_id, round_number, time_limit_seconds, started_at, ended_at"
ANSWER_COLUMNS = (
    "id, battle_id, round_id, telegram_id, team_id, answer, is_correct, "
    "answered_at, response_time_ms"
)


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _map_challenge(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "challengerTeamId": row.get("challenger_team_id"),
        "opponentTeamId": row.get("opponent_team_id"),
        "status": row.get("status"),
        "currentRoundNumber": row.get("current_round_number"),
        "createdAt": row.get("created_at"),
        "startedAt": row.get("started_at"),
        "finishedAt": row.get("finished_at"),
    }


def _map_round(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "battleId": row.get("battle_id"),
        "questionId": row.get("question_id"),
        "roundNumber": row.get("round_number"),
        "timeLimitSeconds": row.get("time_limit_seconds"),
        "startedAt": row.get("started_at"),
        "endedAt": row.get("ended_at"),
    }


# ---------------- Challenges ----------------


def create_challenge(challenger_team_id: str, opponent_team_id: str) -> dict[str, Any]:
    result = (
        table("battle_challenges")
        .insert(
            {
                "challenger_team_id": challenger_team_id,
                "opponent_team_id": opponent_team_id,
                "status": "pending",
            }
        )
        .select(CHALLENGE_COLUMNS)
        .single()
        .execute()
    )
    if result["error"] or not result["data"]:
        raise AppError(500, "Bellashuv yaratib bo'lmadi")
    return _map_challenge(result["data"])


def get_challenge_by_id(battle_id: str) -> dict[str, Any] | None:
    result = (
        table("battle_challenges")
        .select(CHALLENGE_COLUMNS)
        .eq("id", battle_id)
        .maybe_single()
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Bellashuvni olib bo'lmadi")
    return _map_challenge(result["data"]) if result["data"] else None


def get_active_challenges_for_team(team_id: str) -> list[dict[str, Any]]:
    result = (
        table("battle_challenges")
        .select(CHALLENGE_COLUMNS)
        .or_(f"challenger_team_id.eq.{team_id},opponent_team_id.eq.{team_id}")
        .in_("status", ["pending", "accepted", "in_progress"])
        .order("created_at", ascending=False)
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Bellashuvlarni olib bo'lmadi")
    return [_map_challenge(row) for row in result["data"] or []]


# ---------------- Rounds ----------------


def create_rounds(battle_id: str, items: list[dict[str, Any]]) -> None:
    rows = [
        {
            "battle_id": battle_id,
            "question_id": item["questionId"],
            "round_number": item["roundNumber"],
            "time_limit_seconds": item["timeLimitSeconds"],
        }
        for item in items
    ]
    result = table("battle_rounds").insert(rows).execute()
    if result["error"]:
        raise AppError(500, "Round'larni yaratib bo'lmadi")


def get_rounds(battle_id: str) -> list[dict[str, Any]]:
    result = (
        table("battle_rounds")
        .select(ROUND_COLUMNS)
        .eq("battle_id", battle_id)
        .order("round_number", ascending=True)
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Round'larni olib bo'lmadi")
    return [_map_round(row) for row in result["data"] or []]


def get_round_by_number(battle_id: str, round_number: int) -> dict[str, Any] | None:
    result = (
        table("battle_rounds")
        .select(ROUND_COLUMNS)
        .eq("battle_id", battle_id)
        .eq("round_number", round_number)
        .maybe_single()
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Round'ni olib bo'lmadi")
    return _map_round(result["data"]) if result["data"] else None


def mark_round_started(round_id: str) -> None:
    result = (
        table("battle_rounds")
        .update({"started_at": _now_iso()})
        .eq("id", round_id)
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Round'ni boshlab bo'lmadi")


# ---------------- Answers ----------------


def record_answer(
    *,
    battle_id: str,
    round_id: str,
    telegram_id: int,
    team_id: str,
    answer: str,
    is_correct: bool,
    response_time_ms: int,
) -> dict[str, Any]:
    """Javobni yozadi. UNIQUE (round_id, telegram_id) buzilsa duplicate qaytaradi."""
    result = (
        table("battle_answers")
        .insert(
            {
                "battle_id": battle_id,
                "round_id": round_id,
                "telegram_id": telegram_id,
                "team_id": team_id,
                "answer": answer,
                "is_correct": is_correct,
                "response_time_ms": response_time_ms,
            }
        )
        .execute()
    )
    if result["error"]:
        error_payload = result["error"]
        code = None
        if isinstance(error_payload, dict):
            code = str(error_payload.get("code"))
        if code == "23505":
            return {"duplicate": True}
        raise AppError(500, "Javobni yozib bo'lmadi")
    return {"duplicate": False}


def get_answers_for_round(round_id: str) -> list[dict[str, Any]]:
    result = (
        table("battle_answers")
        .select(ANSWER_COLUMNS)
        .eq("round_id", round_id)
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Javoblarni olib bo'lmadi")
    return result["data"] or []


def get_answers_for_battle(battle_id: str) -> list[dict[str, Any]]:
    result = (
        table("battle_answers")
        .select(ANSWER_COLUMNS)
        .eq("battle_id", battle_id)
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Bellashuv javoblarini olib bo'lmadi")
    return result["data"] or []


# ---------------- Atomik gate'lar ----------------


def try_start_game(battle_id: str) -> bool:
    """status='pending' bo'lsa 'in_progress' ga olamiz. False bo'lsa raqib oldinroq qabul qilgan."""
    result = (
        table("battle_challenges")
        .update(
            {
                "status": "in_progress",
                "started_at": _now_iso(),
                "current_round_number": 1,
            }
        )
        .eq("id", battle_id)
        .eq("status", "pending")
        .select("id")
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Bellashuvni boshlab bo'lmadi")
    return len(result["data"] or []) > 0


def try_advance_current_round(battle_id: str, from_number: int, to_number: int) -> bool:
    result = (
        table("battle_challenges")
        .update({"current_round_number": to_number})
        .eq("id", battle_id)
        .eq("status", "in_progress")
        .eq("current_round_number", from_number)
        .select("id")
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Roundni o'tkazib bo'lmadi")
    return len(result["data"] or []) > 0


def try_finalize(battle_id: str) -> bool:
    result = (
        table("battle_challenges")
        .update({"status": "finished", "finished_at": _now_iso()})
        .eq("id", battle_id)
        .eq("status", "in_progress")
        .select("id")
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Bellashuvni yakunlab bo'lmadi")
    return len(result["data"] or []) > 0


def try_end_round(round_id: str) -> bool:
    result = (
        table("battle_rounds")
        .update({"ended_at": _now_iso()})
        .eq("id", round_id)
        .is_("ended_at", "null")
        .select("id")
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Round'ni yakunlab bo'lmadi")
    return len(result["data"] or []) > 0


def try_cancel_or_decline(battle_id: str) -> bool:
    result = (
        table("battle_challenges")
        .update({"status": "declined"})
        .eq("id", battle_id)
        .eq("status", "pending")
        .select("id")
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Bellashuvni bekor qilib bo'lmadi")
    return len(result["data"] or []) > 0
