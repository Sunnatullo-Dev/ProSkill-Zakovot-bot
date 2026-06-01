"""Yutuqlar va ularning bonus ballari — server-side ro'yxat.

Frontend dagi `utils/achievements.ts` bilan bir xil sinxron bo'lishi kerak.
Server xavfsizroq: foydalanuvchi localStorage'ni o'zgartirib bonusni
takror olishga uddasi yo'q — bonus faqat bir marta beriladi, chunki
`unlocked_achievements` ro'yxati bazaga yoziladi.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class AchievementDef:
    id: str
    label: str
    bonus: int
    is_unlocked: Callable[[dict], bool]


ACHIEVEMENTS: list[AchievementDef] = [
    AchievementDef(
        id="first-game",
        label="Birinchi qadam",
        bonus=5,
        is_unlocked=lambda stats: stats.get("gamesPlayed", 0) >= 1,
    ),
    AchievementDef(
        id="ten-games",
        label="Tajribali",
        bonus=15,
        is_unlocked=lambda stats: stats.get("gamesPlayed", 0) >= 10,
    ),
    AchievementDef(
        id="score-100",
        label="Zukko",
        bonus=20,
        is_unlocked=lambda stats: stats.get("totalScore", 0) >= 100,
    ),
    AchievementDef(
        id="score-500",
        label="Daho",
        bonus=50,
        is_unlocked=lambda stats: stats.get("totalScore", 0) >= 500,
    ),
    AchievementDef(
        id="best-round",
        label="Rekordchi",
        bonus=25,
        is_unlocked=lambda stats: stats.get("bestRoundScore", 0) >= 20,
    ),
]


def find_newly_unlocked(stats: dict, already_unlocked: list[str]) -> list[AchievementDef]:
    seen = set(already_unlocked)
    return [a for a in ACHIEVEMENTS if a.id not in seen and a.is_unlocked(stats)]
