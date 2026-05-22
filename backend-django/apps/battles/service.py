"""Battle game engine — `battle.service.ts` ning Python varianti.

Race-condition'lardan saqlash uchun atomik gate'lar (`try_*`) ishlatamiz:
- startGameFlow: pending -> in_progress (double-tap accept'dan saqlaydi)
- advanceRound: endedAt=null bo'lsa belgilash + currentRoundNumber'ni atomik o'tkazish
- finalizeBattle: in_progress -> finished (concurrent polling bonusni 2 marta bermaydi)
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from apps.answers.gemini import check_answer
from apps.core.exceptions import AppError
from apps.core.telegram_notifier import escape_html, notify_members
from apps.questions.repositories import get_question_by_id, get_round_questions
from apps.teams.repositories import (
    find_membership,
    get_team_by_id,
    get_team_with_members,
    update_status as update_team_status,
)
from apps.users.repositories import add_score as add_user_score

from . import repositories as battle_repo


logger = logging.getLogger(__name__)


TOTAL_ROUNDS = 10
ROUND_TIME_LIMIT_SECONDS = 15
TIMEOUT_GRACE_MS = 2_000
MIN_QUESTIONS_FOR_BATTLE = 5
WINNER_BONUS = 5


# ---------------- Notifikatsiyalar ----------------


def _notify_challenge_created(challenger_team_name: str, opponent_team_id: str) -> None:
    try:
        team = get_team_with_members(opponent_team_id)
        text = (
            "⚔️ <b>"
            + escape_html(challenger_team_name)
            + "</b> sizning jamoangizga bellashuv taklif qildi!\n\n"
            "Mini Appni oching va qabul yoki rad qiling."
        )
        notify_members([m["telegramId"] for m in team.get("members", [])], text)
    except Exception as error:  # noqa: BLE001
        logger.warning("notifyChallengeCreated: %s", error)


def _notify_challenge_cancelled(challenger_team_name: str, opponent_team_id: str) -> None:
    try:
        team = get_team_with_members(opponent_team_id)
        text = f"✖️ <b>{escape_html(challenger_team_name)}</b> yuborgan chaqiruvni bekor qildi."
        notify_members([m["telegramId"] for m in team.get("members", [])], text)
    except Exception as error:  # noqa: BLE001
        logger.warning("notifyChallengeCancelled: %s", error)


def _notify_challenge_declined(opponent_team_name: str, challenger_team_id: str) -> None:
    try:
        team = get_team_with_members(challenger_team_id)
        text = f"❌ <b>{escape_html(opponent_team_name)}</b> taklifingizni rad etdi."
        notify_members([m["telegramId"] for m in team.get("members", [])], text)
    except Exception as error:  # noqa: BLE001
        logger.warning("notifyChallengeDeclined: %s", error)


def _notify_battle_started(challenger_team_id: str, opponent_team_id: str) -> None:
    try:
        challenger = get_team_with_members(challenger_team_id)
        opponent = get_team_with_members(opponent_team_id)
        text = (
            "\U0001F3AF <b>Bellashuv boshlandi!</b>\n\n"
            f"{escape_html(challenger['name'])} \U0001F19A {escape_html(opponent['name'])}\n\n"
            "10 ta savol, har biri 15 soniya. Hoziroq kirib o'yinga uling!"
        )
        ids = [m["telegramId"] for m in challenger.get("members", [])]
        ids.extend(m["telegramId"] for m in opponent.get("members", []))
        notify_members(ids, text)
    except Exception as error:  # noqa: BLE001
        logger.warning("notifyBattleStarted: %s", error)


def _notify_battle_finished(
    challenger_team_id: str,
    opponent_team_id: str,
    challenger_score: int,
    opponent_score: int,
    winner_team_id: Optional[str],
) -> None:
    try:
        challenger = get_team_with_members(challenger_team_id)
        opponent = get_team_with_members(opponent_team_id)

        if winner_team_id is None:
            text = (
                "\U0001F91D <b>Bellashuv tugadi — durang!</b>\n\n"
                f"{escape_html(challenger['name'])}: {challenger_score} · "
                f"{escape_html(opponent['name'])}: {opponent_score}"
            )
        else:
            winner = challenger if winner_team_id == challenger["id"] else opponent
            loser = opponent if winner_team_id == challenger["id"] else challenger
            winner_pts = challenger_score if winner_team_id == challenger["id"] else opponent_score
            loser_pts = opponent_score if winner_team_id == challenger["id"] else challenger_score
            text = (
                "\U0001F3C6 <b>Bellashuv tugadi!</b>\n\n"
                f"G'olib: <b>{escape_html(winner['name'])}</b> ({winner_pts})\n"
                f"Mag'lub: {escape_html(loser['name'])} ({loser_pts})\n\n"
                f"G'olib jamoa har a'zosiga +{WINNER_BONUS} ball!"
            )

        ids = [m["telegramId"] for m in challenger.get("members", [])]
        ids.extend(m["telegramId"] for m in opponent.get("members", []))
        notify_members(ids, text)
    except Exception as error:  # noqa: BLE001
        logger.warning("notifyBattleFinished: %s", error)


# ---------------- Yordamchi ----------------


def _team_score(answers: list[dict[str, Any]], team_id: str) -> int:
    return sum(1 for ans in answers if ans.get("team_id") == team_id and ans.get("is_correct") is True)


def _parse_iso(value: Optional[str]) -> Optional[float]:
    """ISO 8601 vaqtni unix epoch ms ga aylantiradi (suffix bo'lmasligi mumkin)."""
    if not value:
        return None
    text = value.replace("Z", "+00:00") if value.endswith("Z") else value
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp() * 1000


def _now_ms() -> int:
    return int(time.time() * 1000)


# ---------------- Asosiy engine ----------------


def start_game_flow(battle_id: str) -> None:
    """Bellashuv accept qilinganda chaqiriladi. Idempotent — qaytar bossa 409."""
    challenge = battle_repo.get_challenge_by_id(battle_id)
    if not challenge:
        raise AppError(404, "Bellashuv topilmadi")
    if challenge["status"] != "pending":
        raise AppError(409, "Bellashuv allaqachon boshlangan")

    questions = get_round_questions(count=TOTAL_ROUNDS, category=None, difficulty=None)
    if len(questions) < MIN_QUESTIONS_FOR_BATTLE:
        raise AppError(500, "Yetarli savol topilmadi")

    # Atomik gate: faqat bitta accept-call pending -> in_progress qila oladi.
    if not battle_repo.try_start_game(battle_id):
        raise AppError(409, "Bellashuv allaqachon boshlangan")

    items = [
        {
            "questionId": question["id"],
            "roundNumber": index + 1,
            "timeLimitSeconds": ROUND_TIME_LIMIT_SECONDS,
        }
        for index, question in enumerate(questions)
    ]
    battle_repo.create_rounds(battle_id, items)

    update_team_status(challenge["challengerTeamId"], "in_battle")
    update_team_status(challenge["opponentTeamId"], "in_battle")

    first_round = battle_repo.get_round_by_number(battle_id, 1)
    if first_round:
        battle_repo.mark_round_started(first_round["id"])

    _notify_battle_started(challenge["challengerTeamId"], challenge["opponentTeamId"])


def process_answer(
    battle_id: str,
    telegram_id: int,
    round_id: str,
    user_answer: str,
) -> dict[str, Any]:
    challenge = battle_repo.get_challenge_by_id(battle_id)
    if not challenge:
        raise AppError(404, "Bellashuv topilmadi")
    if challenge["status"] != "in_progress":
        raise AppError(409, "Bellashuv hozir aktiv emas")

    membership = find_membership(telegram_id)
    if not membership or membership["team_id"] not in (
        challenge["challengerTeamId"],
        challenge["opponentTeamId"],
    ):
        raise AppError(403, "Siz bu bellashuvda emassiz")

    round_row = battle_repo.get_round_by_number(battle_id, challenge["currentRoundNumber"])
    if not round_row or round_row["id"] != round_id:
        raise AppError(409, "Bu round aktiv emas")
    if round_row["endedAt"]:
        raise AppError(409, "Round tugagan")

    started_at_ms = _parse_iso(round_row["startedAt"]) or _now_ms()
    elapsed = _now_ms() - started_at_ms

    if elapsed > round_row["timeLimitSeconds"] * 1000 + TIMEOUT_GRACE_MS:
        raise AppError(409, "Vaqt tugadi")

    question = get_question_by_id(round_row["questionId"])
    if not question:
        raise AppError(500, "Savol topilmadi")

    trimmed = user_answer.strip()
    if trimmed:
        grading = check_answer(question["text"], question["correctAnswer"], trimmed)
    else:
        from apps.answers.gemini import CheckAnswerResult  # avoid circular at import time
        grading = CheckAnswerResult(status="incorrect", explanation="")

    is_correct = grading.status == "correct"

    record = battle_repo.record_answer(
        battle_id=battle_id,
        round_id=round_id,
        telegram_id=telegram_id,
        team_id=membership["team_id"],
        answer=trimmed,
        is_correct=is_correct,
        response_time_ms=int(elapsed),
    )

    if record["duplicate"]:
        raise AppError(409, "Siz bu round'ga javob bergansiz")

    maybe_advance_round(battle_id)

    return {"isCorrect": is_correct, "correctAnswer": question["correctAnswer"]}


def maybe_advance_round(battle_id: str) -> None:
    """Vaqt tugagan yoki barcha a'zolar javob bergan bo'lsa, keyingi roundga o'tadi."""
    challenge = battle_repo.get_challenge_by_id(battle_id)
    if not challenge or challenge["status"] != "in_progress":
        return

    round_row = battle_repo.get_round_by_number(battle_id, challenge["currentRoundNumber"])
    if not round_row or round_row["endedAt"]:
        return

    started_at_ms = _parse_iso(round_row["startedAt"]) or _now_ms()
    elapsed = _now_ms() - started_at_ms
    time_up = elapsed > round_row["timeLimitSeconds"] * 1000

    all_answered = False
    if not time_up:
        challenger = get_team_with_members(challenge["challengerTeamId"])
        opponent = get_team_with_members(challenge["opponentTeamId"])
        round_answers = battle_repo.get_answers_for_round(round_row["id"])
        total_members = len(challenger.get("members", [])) + len(opponent.get("members", []))
        all_answered = total_members > 0 and len(round_answers) >= total_members

    if time_up or all_answered:
        advance_round(battle_id)


def advance_round(battle_id: str) -> None:
    """Joriy roundni yakunlaydi va keyingisiga o'tadi (yoki finalizeBattle)."""
    challenge = battle_repo.get_challenge_by_id(battle_id)
    if not challenge or challenge["status"] != "in_progress":
        return

    current_number = challenge["currentRoundNumber"]
    current = battle_repo.get_round_by_number(battle_id, current_number)

    # Atomik gate: faqat bitta chaqiruv "joriy roundni yopdim" deyishi mumkin.
    if current:
        ended = battle_repo.try_end_round(current["id"])
        if not ended:
            return

    next_number = current_number + 1
    next_round = battle_repo.get_round_by_number(battle_id, next_number)

    if next_round:
        advanced = battle_repo.try_advance_current_round(battle_id, current_number, next_number)
        if not advanced:
            return
        battle_repo.mark_round_started(next_round["id"])
    else:
        finalize_battle(battle_id)


def finalize_battle(battle_id: str) -> None:
    challenge = battle_repo.get_challenge_by_id(battle_id)
    if not challenge or challenge["status"] != "in_progress":
        return

    # Atomik gate: bonus ikki marta berilmasligi uchun.
    if not battle_repo.try_finalize(battle_id):
        return

    answers = battle_repo.get_answers_for_battle(battle_id)
    challenger_score = _team_score(answers, challenge["challengerTeamId"])
    opponent_score = _team_score(answers, challenge["opponentTeamId"])

    winner_team_id: Optional[str] = None
    if challenger_score > opponent_score:
        winner_team_id = challenge["challengerTeamId"]
    elif opponent_score > challenger_score:
        winner_team_id = challenge["opponentTeamId"]

    if winner_team_id:
        try:
            winning_team = get_team_with_members(winner_team_id)
            for member in winning_team.get("members", []):
                try:
                    add_user_score(member["telegramId"], WINNER_BONUS)
                except Exception as member_error:  # noqa: BLE001
                    logger.warning("addScore winner: %s", member_error)
        except Exception as win_error:  # noqa: BLE001
            logger.warning("finalizeBattle winner award: %s", win_error)

    for team_id in (challenge["challengerTeamId"], challenge["opponentTeamId"]):
        try:
            update_team_status(team_id, "open")
        except Exception as error:  # noqa: BLE001
            logger.warning("reset team status: %s", error)

    _notify_battle_finished(
        challenge["challengerTeamId"],
        challenge["opponentTeamId"],
        challenger_score,
        opponent_score,
        winner_team_id,
    )


def get_battle_state(battle_id: str, telegram_id: int) -> dict[str, Any]:
    """Frontend BattlePage'i har 2s da polling qiladi."""
    maybe_advance_round(battle_id)

    challenge = battle_repo.get_challenge_by_id(battle_id)
    if not challenge:
        raise AppError(404, "Bellashuv topilmadi")

    challenger = get_team_with_members(challenge["challengerTeamId"])
    opponent = get_team_with_members(challenge["opponentTeamId"])
    answers = battle_repo.get_answers_for_battle(battle_id)
    rounds = battle_repo.get_rounds(battle_id)

    challenger_score = _team_score(answers, challenge["challengerTeamId"])
    opponent_score = _team_score(answers, challenge["opponentTeamId"])

    my_team_id: Optional[str] = None
    if any(m["telegramId"] == telegram_id for m in challenger.get("members", [])):
        my_team_id = challenger["id"]
    elif any(m["telegramId"] == telegram_id for m in opponent.get("members", [])):
        my_team_id = opponent["id"]

    current_round: Optional[dict[str, Any]] = None
    current_round_id: Optional[str] = None
    if challenge["status"] == "in_progress":
        round_row = battle_repo.get_round_by_number(battle_id, challenge["currentRoundNumber"])
        if round_row:
            question = get_question_by_id(round_row["questionId"])
            started_at_ms = _parse_iso(round_row["startedAt"]) or _now_ms()
            elapsed = _now_ms() - started_at_ms
            remaining = max(0, round_row["timeLimitSeconds"] * 1000 - elapsed)
            my_answered = any(
                ans.get("round_id") == round_row["id"] and ans.get("telegram_id") == telegram_id
                for ans in answers
            )
            current_round = {
                "roundId": round_row["id"],
                "roundNumber": round_row["roundNumber"],
                "totalRounds": len(rounds) or TOTAL_ROUNDS,
                "questionText": (question or {}).get("text", ""),
                "timeLimitSeconds": round_row["timeLimitSeconds"],
                "timeRemainingMs": int(remaining),
                "myAnswered": my_answered,
            }
            current_round_id = round_row["id"]

    def team_view(team: dict[str, Any], score: int) -> dict[str, Any]:
        return {
            "id": team["id"],
            "name": team["name"],
            "score": score,
            "members": [
                {
                    "telegramId": m["telegramId"],
                    "firstName": m.get("firstName"),
                    "username": m.get("username"),
                    "answeredCurrentRound": (
                        any(
                            ans.get("round_id") == current_round_id
                            and ans.get("telegram_id") == m["telegramId"]
                            for ans in answers
                        )
                        if current_round_id
                        else False
                    ),
                }
                for m in team.get("members", [])
            ],
        }

    winner_team_id: Optional[str] = None
    if challenge["status"] == "finished":
        if challenger_score > opponent_score:
            winner_team_id = challenge["challengerTeamId"]
        elif opponent_score > challenger_score:
            winner_team_id = challenge["opponentTeamId"]

    return {
        "battleId": challenge["id"],
        "status": challenge["status"],
        "challengerTeam": team_view(challenger, challenger_score),
        "opponentTeam": team_view(opponent, opponent_score),
        "myTeamId": my_team_id,
        "currentRound": current_round,
        "finished": challenge["status"] == "finished",
        "winnerTeamId": winner_team_id,
    }


# ---------------- Challenge boshqaruvi ----------------


def challenge(challenger_owner_telegram_id: int, opponent_team_code: str) -> dict[str, Any]:
    challenger_membership = find_membership(challenger_owner_telegram_id)
    if not challenger_membership:
        raise AppError(403, "Avval jamoaga qo'shiling")

    challenger_team = get_team_by_id(challenger_membership["team_id"])
    if not challenger_team:
        raise AppError(404, "Jamoa topilmadi")
    if challenger_team["ownerId"] != challenger_owner_telegram_id:
        raise AppError(403, "Faqat jamoa egasi taklif qila oladi")
    if challenger_team["status"] != "open":
        raise AppError(409, "Jamoangiz hozir o'yinda yoki yopiq")

    from apps.teams.repositories import find_team_by_code

    opponent_team = find_team_by_code(opponent_team_code)
    if not opponent_team:
        raise AppError(404, "Raqib jamoa topilmadi")
    if opponent_team["id"] == challenger_team["id"]:
        raise AppError(400, "O'z jamoangizga taklif yubora olmaysiz")
    if opponent_team["status"] != "open":
        raise AppError(409, "Raqib jamoa hozir o'yinda yoki yopiq")

    existing = battle_repo.get_active_challenges_for_team(challenger_team["id"])
    existing.extend(battle_repo.get_active_challenges_for_team(opponent_team["id"]))
    if existing:
        raise AppError(409, "Jamoalardan birida allaqachon faol taklif bor")

    battle = battle_repo.create_challenge(challenger_team["id"], opponent_team["id"])
    _notify_challenge_created(challenger_team["name"], opponent_team["id"])
    return battle


def accept_challenge(battle_id: str, opponent_owner_telegram_id: int) -> None:
    challenge_row = battle_repo.get_challenge_by_id(battle_id)
    if not challenge_row:
        raise AppError(404, "Bellashuv topilmadi")
    if challenge_row["status"] != "pending":
        raise AppError(409, "Bu taklifni qabul qilish mumkin emas")

    opponent_team = get_team_by_id(challenge_row["opponentTeamId"])
    if not opponent_team or opponent_team["ownerId"] != opponent_owner_telegram_id:
        raise AppError(403, "Faqat raqib jamoa egasi qabul qila oladi")

    start_game_flow(battle_id)


def cancel_challenge(battle_id: str, challenger_owner_telegram_id: int) -> None:
    challenge_row = battle_repo.get_challenge_by_id(battle_id)
    if not challenge_row:
        raise AppError(404, "Bellashuv topilmadi")
    if challenge_row["status"] != "pending":
        raise AppError(409, "Faqat kutilayotgan taklifni bekor qilish mumkin")

    challenger_team = get_team_by_id(challenge_row["challengerTeamId"])
    if not challenger_team or challenger_team["ownerId"] != challenger_owner_telegram_id:
        raise AppError(403, "Faqat jamoa egasi taklifni bekor qila oladi")

    if not battle_repo.try_cancel_or_decline(battle_id):
        raise AppError(409, "Bu taklif allaqachon yopilgan")

    _notify_challenge_cancelled(challenger_team["name"], challenge_row["opponentTeamId"])


def decline_challenge(battle_id: str, opponent_owner_telegram_id: int) -> None:
    challenge_row = battle_repo.get_challenge_by_id(battle_id)
    if not challenge_row:
        raise AppError(404, "Bellashuv topilmadi")
    if challenge_row["status"] != "pending":
        raise AppError(409, "Bu taklifni rad etish mumkin emas")

    opponent_team = get_team_by_id(challenge_row["opponentTeamId"])
    if not opponent_team or opponent_team["ownerId"] != opponent_owner_telegram_id:
        raise AppError(403, "Faqat raqib jamoa egasi rad eta oladi")

    if not battle_repo.try_cancel_or_decline(battle_id):
        raise AppError(409, "Bu taklif allaqachon yopilgan")

    _notify_challenge_declined(opponent_team["name"], challenge_row["challengerTeamId"])


def get_pending_for_user(telegram_id: int) -> list[dict[str, Any]]:
    membership = find_membership(telegram_id)
    if not membership:
        return []

    challenges = battle_repo.get_active_challenges_for_team(membership["team_id"])
    result: list[dict[str, Any]] = []

    for ch in challenges:
        if ch["status"] not in ("pending", "accepted", "in_progress"):
            continue
        challenger_team = get_team_by_id(ch["challengerTeamId"])
        opponent_team = get_team_by_id(ch["opponentTeamId"])
        if not challenger_team or not opponent_team:
            continue
        result.append(
            {
                "battleId": ch["id"],
                "status": ch["status"],
                "challengerTeam": challenger_team,
                "opponentTeam": opponent_team,
                "iAmOpponent": membership["team_id"] == ch["opponentTeamId"],
                "createdAt": ch["createdAt"],
            }
        )
    return result
