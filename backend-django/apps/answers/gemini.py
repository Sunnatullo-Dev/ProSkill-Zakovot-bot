"""Gemini orqali javob bahosi va savol tushuntirishi.

Eski Node loyihasidagi `services/gemini.service.ts` ga to'liq mos keladi:
- checkAnswer Gemini'ga so'rov yuboradi, JSON {status, explanation} kutadi
- Gemini ishlamasa (timeout, kvota, format xatosi) — lokal solishtirish
- explainQuestion "Javobni bilmayman" funksiyasi uchun qisqa ma'lumot beradi
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Optional

from django.conf import settings

from .scoring import AnswerStatus


GEMINI_TIMEOUT_S = 10
MIN_PARTIAL_LENGTH = 3
_PUNCTUATION_RE = re.compile(r"[().,!?\-]")
_WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class CheckAnswerResult:
    status: AnswerStatus
    explanation: str


def check_answer(question: str, correct_answer: str, user_answer: str) -> CheckAnswerResult:
    """Gemini'dan javobni tekshirishni so'raydi; ishlamasa lokal fallback."""
    if not user_answer.strip():
        return CheckAnswerResult(status="incorrect", explanation="")

    parsed = _call_gemini(_build_check_prompt(question, correct_answer, user_answer))
    if parsed is not None:
        return parsed

    return _local_check(correct_answer, user_answer)


def explain_question(question: str, correct_answer: str) -> str:
    """Savol mavzusi haqida 2-3 jumlali ma'lumot. Xato bo'lsa bo'sh string."""
    prompt = (
        "Sen bilimli o'qituvchisan. Quyidagi savol mavzusi haqida o'zbek tilida\n"
        "2-3 jumlalik qisqa, sodda va foydali ma'lumot ber.\n"
        f"Savol: {question}\n"
        f"To'g'ri javob: {correct_answer}\n"
        "Faqat ma'lumot matnini yoz, boshqa hech narsa qo'shma."
    )
    text = _call_gemini_text(prompt)
    return text.strip() if text else ""


# ---------- ichki yordamchilar ----------


def _call_gemini(prompt: str) -> Optional[CheckAnswerResult]:
    text = _call_gemini_text(prompt)
    if not text:
        return None
    return _parse_gemini_response(text)


def _call_gemini_text(prompt: str) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None

    try:
        # Lazy import — Gemini paketi yetib bormagan muhitda ham app yuklansin.
        import google.generativeai as genai
    except ImportError:
        return None

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            request_options={"timeout": GEMINI_TIMEOUT_S},
        )
        return (response.text or "").strip()
    except Exception as error:  # noqa: BLE001 — har qanday xatoni fallback bilan jim qoldiramiz
        print(f"[gemini] call failed: {error}")
        return None


def _build_check_prompt(question: str, correct_answer: str, user_answer: str) -> str:
    return (
        "Sen bilim o'yini hakamisisan. Faqat JSON qaytarasan.\n"
        f"Savol: {question}\n"
        f"To'g'ri javob: {correct_answer}\n"
        f"Foydalanuvchi javobi: {user_answer}\n\n"
        "Qoidalar:\n"
        "- Imlo xatolariga e'tibor berma\n"
        "- Ma'no to'g'ri bo'lsa \"correct\" ber\n"
        "- Qisman to'g'ri (yaqin, lekin to'liq emas) bo'lsa \"partial\"\n"
        "- Umuman noto'g'ri bo'lsa \"incorrect\"\n"
        "- explanation o'zbek tilida, qisqa (1 gap)\n\n"
        "Faqat JSON qaytar, boshqa hech narsa yozma:\n"
        '{"status":"correct"|"partial"|"incorrect","explanation":"..."}'
    )


def _parse_gemini_response(text: str) -> Optional[CheckAnswerResult]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None

    try:
        data = json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        return None

    status = data.get("status")
    if status not in {"correct", "partial", "incorrect"}:
        return None

    explanation = data.get("explanation")
    return CheckAnswerResult(
        status=status,
        explanation=explanation if isinstance(explanation, str) else "",
    )


def _local_check(correct_answer: str, user_answer: str) -> CheckAnswerResult:
    user = _normalize(user_answer)
    correct = _normalize(correct_answer)

    if not user:
        return CheckAnswerResult(status="incorrect", explanation="")
    if user == correct:
        return CheckAnswerResult(status="correct", explanation="")
    if user in correct and len(user) >= MIN_PARTIAL_LENGTH:
        return CheckAnswerResult(status="partial", explanation="")
    return CheckAnswerResult(status="incorrect", explanation="")


def _normalize(value: str) -> str:
    lowered = value.lower().strip()
    cleaned = _PUNCTUATION_RE.sub(" ", lowered)
    return _WHITESPACE_RE.sub(" ", cleaned).strip()
