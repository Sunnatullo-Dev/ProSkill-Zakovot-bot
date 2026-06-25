from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.core.exceptions import AppError
from apps.questions.repositories import get_round_questions, get_questions_by_ids

from .models import DailyChallenge, DailyChallengeEntry, DailyAnswer, UserDailyStreak


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
    today = timezone.localdate()
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


def get_today_question_ids() -> list[str]:
    """Bugungi daily challenge savol ID'larini qaytaradi."""
    challenge = DailyChallenge.objects.filter(date=timezone.localdate()).first()
    return list(challenge.question_ids) if challenge else []


def record_daily_answer(
    telegram_id: int,
    question_id: str,
    is_correct: bool,
    points_earned: int,
) -> None:
    """Daily javobni yozadi. Takroriy yuborishda (unique_together) jimgina o'tib ketadi."""
    try:
        DailyAnswer.objects.get_or_create(
            telegram_id=telegram_id,
            date=timezone.localdate(),
            question_id=question_id,
            defaults={"is_correct": is_correct, "points_earned": points_earned},
        )
    except Exception:
        pass


def get_daily_answers(telegram_id: int) -> list[dict]:
    """Foydalanuvchining bugungi daily javoblari."""
    rows = DailyAnswer.objects.filter(telegram_id=telegram_id, date=timezone.localdate())
    return [
        {"question_id": r.question_id, "is_correct": r.is_correct, "points_earned": r.points_earned}
        for r in rows
    ]


def has_completed_today(telegram_id: int) -> bool:
    return DailyChallengeEntry.objects.filter(
        telegram_id=telegram_id, date=timezone.localdate()
    ).exists()


def complete_daily(telegram_id: int) -> dict[str, Any]:
    """Kunlik topshiriqni yakunlaydi.

    correct_count va score_earned kliyentdan qabul qilinmaydi —
    DailyAnswer jadvalidan hisoblanadi.
    Foydalanuvchi hech bo'lmasa bitta daily javob yubormagan bo'lsa,
    403 xatosi qaytariladi.
    """
    from apps.users.repositories import add_score

    today = timezone.localdate()

    if DailyChallengeEntry.objects.filter(telegram_id=telegram_id, date=today).exists():
        raise AppError(409, "Bugun allaqachon yakunlangansiz")

    today_ids = get_today_question_ids()
    if not today_ids:
        raise AppError(500, "Bugungi topshiriq topilmadi")

    answers = get_daily_answers(telegram_id)
    valid_answers = [a for a in answers if a["question_id"] in set(today_ids)]

    if not valid_answers:
        raise AppError(403, "Savollarni yechmasdan topshiriqni yakunlab bo'lmaydi")

    correct_count = sum(1 for a in valid_answers if a["is_correct"])
    score_earned = sum(a["points_earned"] for a in valid_answers)

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
