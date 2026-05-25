"""A/B/C/D test rejimi uchun aniq taqqoslash baholash.

Bu fayl Gemini'siz, AI'siz baholash logikasini saqlaydi. Faqat
multiple-choice rejimda ishlatiladi — foydalanuvchi 4 ta variantdan
birini tanlaydi va biz uni `correct_answer` bilan aniq solishtiramiz.

Erkin matnli savollar uchun `gemini.check_answer` ishlatiladi.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Literal


GradingStatus = Literal["correct", "incorrect"]


@dataclass(frozen=True)
class GradingResult:
    status: GradingStatus
    explanation: str


def _normalize(text: str) -> str:
    """Kichik harf, Unicode NFC normalizatsiya, atrof bo'shliqlar olib tashlash.

    O'zbek lotin/kirill matnda Unicode kompozitsiya muammolari bo'lishi mumkin
    (masalan, "ŏ" = "o" + combining mark). NFC formatlash bilan bir xil
    ko'rinishdagi belgilar bir xil baytlarga aylanadi.
    """
    if text is None:
        return ""
    normalized = unicodedata.normalize("NFC", text).strip().lower()
    return normalized


def exact_match_grade(user_answer: str, correct_answer: str) -> GradingResult:
    """A/B/C/D rejimi: javob aynan bir xilmi tekshir.

    Frontend foydalanuvchiga 4 ta variantni ko'rsatadi va `userAnswer`
    sifatida tanlangan variant matnini yuboradi — shu sababli AI kerak emas.
    """
    if not user_answer or not correct_answer:
        return GradingResult(status="incorrect", explanation="")
    if _normalize(user_answer) == _normalize(correct_answer):
        return GradingResult(status="correct", explanation="")
    return GradingResult(status="incorrect", explanation="")
