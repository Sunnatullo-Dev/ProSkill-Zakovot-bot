"""Javob uchun ball hisoblash — eski `scoring.service.ts` ning aniq nusxasi.

Qoidalar:
- noto'g'ri/partial javob: 0 ball, streak qayta nolga tushadi
- to'g'ri javob: 4s va undan tez bo'lsa 2 ball, aks holda 1 ball
- 3 ta yoki undan ko'p ketma-ket to'g'ri javob bo'lsa +1 streak bonus
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

AnswerStatus = Literal["correct", "partial", "incorrect"]

FAST_ANSWER_MS = 4000
FAST_POINTS = 2
BASE_POINTS = 1
STREAK_THRESHOLD = 3
STREAK_BONUS = 1


@dataclass(frozen=True)
class ScoreInput:
    status: AnswerStatus
    time_taken_ms: int
    streak_before: int


@dataclass(frozen=True)
class ScoreResult:
    points_earned: int
    streak_after: int


def calculate_answer_score(input_: ScoreInput) -> ScoreResult:
    if input_.status != "correct":
        return ScoreResult(points_earned=0, streak_after=0)

    base = FAST_POINTS if input_.time_taken_ms <= FAST_ANSWER_MS else BASE_POINTS
    streak_after = input_.streak_before + 1
    bonus = STREAK_BONUS if streak_after >= STREAK_THRESHOLD else 0
    return ScoreResult(points_earned=base + bonus, streak_after=streak_after)
