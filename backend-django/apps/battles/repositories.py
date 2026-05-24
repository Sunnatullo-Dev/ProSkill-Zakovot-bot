from __future__ import annotations

from typing import Any

from django.db import IntegrityError
from django.utils import timezone

from apps.core.exceptions import AppError

from .models import BattleAnswer, BattleChallenge, BattleRound


def _map_challenge(bc: BattleChallenge) -> dict[str, Any]:
    return {
        "id": str(bc.id),
        "challengerTeamId": str(bc.challenger_team_id),
        "opponentTeamId": str(bc.opponent_team_id),
        "status": bc.status,
        "currentRoundNumber": bc.current_round_number,
        "createdAt": bc.created_at.isoformat() if bc.created_at else None,
        "startedAt": bc.started_at.isoformat() if bc.started_at else None,
        "finishedAt": bc.finished_at.isoformat() if bc.finished_at else None,
    }


def _map_round(br: BattleRound) -> dict[str, Any]:
    return {
        "id": str(br.id),
        "battleId": str(br.battle_id),
        "questionId": str(br.question_id),
        "roundNumber": br.round_number,
        "timeLimitSeconds": br.time_limit_seconds,
        "startedAt": br.started_at.isoformat() if br.started_at else None,
        "endedAt": br.ended_at.isoformat() if br.ended_at else None,
    }


# ---------------- Challenges ----------------


def create_challenge(
    challenger_team_id: str, opponent_team_id: str
) -> dict[str, Any]:
    bc = BattleChallenge.objects.create(
        challenger_team_id=challenger_team_id,
        opponent_team_id=opponent_team_id,
        status="pending",
    )
    return _map_challenge(bc)


def get_challenge_by_id(battle_id: str) -> dict[str, Any] | None:
    bc = BattleChallenge.objects.filter(id=battle_id).first()
    return _map_challenge(bc) if bc else None


def get_active_challenges_for_team(team_id: str) -> list[dict[str, Any]]:
    from django.db.models import Q

    bcs = BattleChallenge.objects.filter(
        Q(challenger_team_id=team_id) | Q(opponent_team_id=team_id),
        status__in=["pending", "accepted", "in_progress"],
    ).order_by("-created_at")
    return [_map_challenge(bc) for bc in bcs]


# ---------------- Rounds ----------------


def create_rounds(battle_id: str, items: list[dict[str, Any]]) -> None:
    bc = BattleChallenge.objects.get(id=battle_id)
    BattleRound.objects.bulk_create(
        [
            BattleRound(
                battle=bc,
                question_id=item["questionId"],
                round_number=item["roundNumber"],
                time_limit_seconds=item["timeLimitSeconds"],
            )
            for item in items
        ]
    )


def get_rounds(battle_id: str) -> list[dict[str, Any]]:
    rounds = BattleRound.objects.filter(battle_id=battle_id).order_by("round_number")
    return [_map_round(r) for r in rounds]


def get_round_by_number(battle_id: str, round_number: int) -> dict[str, Any] | None:
    r = BattleRound.objects.filter(
        battle_id=battle_id, round_number=round_number
    ).first()
    return _map_round(r) if r else None


def mark_round_started(round_id: str) -> None:
    BattleRound.objects.filter(id=round_id).update(started_at=timezone.now())


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
    try:
        BattleAnswer.objects.create(
            battle_id=battle_id,
            round_id=round_id,
            telegram_id=telegram_id,
            team_id=team_id,
            answer=answer,
            is_correct=is_correct,
            response_time_ms=response_time_ms,
        )
        return {"duplicate": False}
    except IntegrityError:
        return {"duplicate": True}


def get_answers_for_round(round_id: str) -> list[dict[str, Any]]:
    answers = BattleAnswer.objects.filter(round_id=round_id)
    return [
        {
            "id": str(a.id),
            "battle_id": str(a.battle_id),
            "round_id": str(a.round_id),
            "telegram_id": a.telegram_id,
            "team_id": str(a.team_id),
            "answer": a.answer,
            "is_correct": a.is_correct,
            "answered_at": a.answered_at.isoformat() if a.answered_at else None,
            "response_time_ms": a.response_time_ms,
        }
        for a in answers
    ]


def has_user_answered(round_id: str, telegram_id: int) -> bool:
    """Foydalanuvchi shu round'ga javob berganmi — duplicate'ni oldindan tekshirish.

    Gemini chaqirilishidan oldin tekshirib, ortiqcha LLM xarajatini oldini olamiz.
    """
    return BattleAnswer.objects.filter(
        round_id=round_id, telegram_id=telegram_id
    ).exists()


def get_answers_for_battle(battle_id: str) -> list[dict[str, Any]]:
    answers = BattleAnswer.objects.filter(battle_id=battle_id)
    return [
        {
            "id": str(a.id),
            "battle_id": str(a.battle_id),
            "round_id": str(a.round_id),
            "telegram_id": a.telegram_id,
            "team_id": str(a.team_id),
            "answer": a.answer,
            "is_correct": a.is_correct,
            "answered_at": a.answered_at.isoformat() if a.answered_at else None,
            "response_time_ms": a.response_time_ms,
        }
        for a in answers
    ]


# ---------------- Atomik gate'lar ----------------


def try_start_game(battle_id: str) -> bool:
    updated = BattleChallenge.objects.filter(
        id=battle_id, status="pending"
    ).update(
        status="in_progress",
        started_at=timezone.now(),
        current_round_number=1,
    )
    return updated > 0


def try_advance_current_round(
    battle_id: str, from_number: int, to_number: int
) -> bool:
    updated = BattleChallenge.objects.filter(
        id=battle_id,
        status="in_progress",
        current_round_number=from_number,
    ).update(current_round_number=to_number)
    return updated > 0


def try_finalize(battle_id: str) -> bool:
    updated = BattleChallenge.objects.filter(
        id=battle_id, status="in_progress"
    ).update(status="finished", finished_at=timezone.now())
    return updated > 0


def try_end_round(round_id: str) -> bool:
    updated = BattleRound.objects.filter(
        id=round_id, ended_at__isnull=True
    ).update(ended_at=timezone.now())
    return updated > 0


def try_cancel_or_decline(battle_id: str) -> bool:
    updated = BattleChallenge.objects.filter(
        id=battle_id, status="pending"
    ).update(status="declined")
    return updated > 0
