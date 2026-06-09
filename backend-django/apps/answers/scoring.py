"""Javob uchun ball hisoblash.

Qoidalar:
  noto'g'ri / partial  → 0 ball, streak nolga qaytadi
  to'g'ri              → 4s yoki tezroq: 2 ball; 4s dan sekin: 1 ball
  streak bonus         → 3+ ketma-ket to'g'rida: +1 qo'shimcha ball

streak_before DB'dan o'qiladi — kliyent qiymatiga ishonilmaydi.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

AnswerStatus = Literal["correct", "partial", "incorrect"]

FAST_ANSWER_MS  = 4_000   # 4 soniyada yoki tezroq → fast bonus
FAST_POINTS     = 2       # tez javob bali
BASE_POINTS     = 1       # oddiy to'g'ri javob bali
STREAK_THRESHOLD = 3      # shu va undan yuqorida streak bonus beriladi
STREAK_BONUS    = 1       # streak bonus miqdori


@dataclass(frozen=True)
class ScoreInput:
    status: AnswerStatus
    time_taken_ms: int
    streak_before: int


@dataclass(frozen=True)
class ScoreResult:
    points_earned: int
    streak_after: int


def calculate_answer_score(inp: ScoreInput) -> ScoreResult:
    """Ball va yangi streak'ni hisoblaydi.

    Partial va incorrect uchun:  0 ball, streak = 0
    Correct uchun:
      base   = 2 (tez) | 1 (oddiy)
      bonus  = +1 agar streak_after >= 3
      total  = base + bonus
      streak_after = streak_before + 1
    """
    if inp.status != "correct":
        return ScoreResult(points_earned=0, streak_after=0)

    base = FAST_POINTS if inp.time_taken_ms <= FAST_ANSWER_MS else BASE_POINTS
    streak_after = inp.streak_before + 1
    bonus = STREAK_BONUS if streak_after >= STREAK_THRESHOLD else 0
    return ScoreResult(points_earned=base + bonus, streak_after=streak_after)
