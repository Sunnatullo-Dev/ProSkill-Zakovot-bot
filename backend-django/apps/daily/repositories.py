from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from django.db import transaction

from apps.core.exceptions import AppError
from apps.questions.repositories import get_round_questions, get_questions_by_ids

from .models import DailyChallenge, DailyChallengeEntry, UserDailyStreak


DAILY_QUESTION_COUNT = 5

# (minimal_streak, bonus_ball) — kamayish tartibida tekshiriladi
STREAK_BONUS_TIERS: list[tuple[int, int]] = [
    (30, 20),
    (14, 14),
    (7, 7),
    (3, 3),
]


def get_streak_bonus(streak: int) -> int:
    for threshold, bonus in STREAK_BONUS_TIERS:
        if streak >= threshold:
            return bonus
    return 0


def get_or_create_today() -> DailyChallenge:
    today = date.today()
    challenge = DailyChallenge.objects.filter(date=today).first()
    if challenge:
        return challenge
    questions = get_round_questions(count=DAILY_QUESTION_COUNT, category=None, difficulty=None)
    ids = [q["id"] for q in questions]
    challenge, _ = DailyChallenge.objects.get_or_create(
        date=today,
        defaults={"question_ids": ids},
    )
    return challenge


def get_user_streak(telegram_id: int) -> dict[str, int]:
    streak = UserDailyStreak.objects.filter(telegram_id=telegram_id).first()
    if not streak:
        return {"current": 0, "longest": 0}
    return {"current": streak.current_streak, "longest": streak.longest_streak}


def has_completed_today(telegram_id: int) -> bool:
    return DailyChallengeEntry.objects.filter(
        telegram_id=telegram_id, date=date.today()
    ).exists()


def complete_daily(telegram_id: int, correct_count: int, score_earned: int) -> dict[str, Any]:
    from apps.users.repositories import add_score

    today = date.today()

    if DailyChallengeEntry.objects.filter(telegram_id=telegram_id, date=today).exists():
        raise AppError(409, "Bugun allaqachon yakunlangansiz")

    with transaction.atomic():
        streak_obj, _ = UserDailyStreak.objects.select_for_update().get_or_create(
            telegram_id=telegram_id,
            defaults={"current_streak": 0, "last_date": None, "longest_streak": 0},
        )

        yesterday = today - timedelta(days=1)
        if streak_obj.last_date == yesterday:
            new_streak = streak_obj.current_streak + 1
        else:
            new_streak = 1

        longest = max(streak_obj.longest_streak, new_streak)
        UserDailyStreak.objects.filter(telegram_id=telegram_id).update(
            current_streak=new_streak,
            last_date=today,
            longest_streak=longest,
        )

        streak_bonus = get_streak_bonus(new_streak)

        DailyChallengeEntry.objects.create(
            telegram_id=telegram_id,
            date=today,
            correct_count=correct_count,
            score_earned=score_earned,
            streak_bonus=streak_bonus,
        )

        if streak_bonus > 0:
            add_score(telegram_id, streak_bonus)

    return {
        "newStreak": new_streak,
        "longestStreak": longest,
        "streakBonus": streak_bonus,
    }
