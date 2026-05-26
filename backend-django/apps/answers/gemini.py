"""Gemini orqali javob bahosi va savol tushuntirishi.

Eski Node loyihasidagi `services/gemini.service.ts` ga to'liq mos keladi:
- checkAnswer Gemini'ga so'rov yuboradi, JSON {status, explanation} kutadi
- Gemini ishlamasa (timeout, kvota, format xatosi) — lokal solishtirish
- explainQuestion "Javobni bilmayman" funksiyasi uchun qisqa ma'lumot beradi
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

from django.conf import settings

from .scoring import AnswerStatus


logger = logging.getLogger(__name__)
GEMINI_TIMEOUT_S = 15
# Javob tekshirish uchun alohida aqlli model — oddiy modeldan aniqroq
ANSWER_CHECK_MODEL = "gemini-2.5-flash"
MIN_PARTIAL_LENGTH = 3
_PUNCTUATION_RE = re.compile(r"[().,!?\-]")
_WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class CheckAnswerResult:
    status: AnswerStatus
    explanation: str


def check_answer(question: str, correct_answer: str, user_answer: str) -> CheckAnswerResult:
    """Gemini 2.5 Flash orqali javobni tekshiradi; ishlamasa lokal fallback."""
    if not user_answer.strip():
        return CheckAnswerResult(status="incorrect", explanation="")

    prompt = _build_check_prompt(question, correct_answer, user_answer)
    parsed = _call_gemini(prompt, model=ANSWER_CHECK_MODEL)
    if parsed is not None:
        return parsed

    return _local_check(correct_answer, user_answer)


def generate_tts(text: str) -> Optional[bytes]:
    """Gemini 2.5 Flash TTS orqali WAV audio yaratadi. Xato bo'lsa None."""
    if not settings.GEMINI_API_KEY:
        return None

    import base64
    import requests as _http

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash-preview-tts:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}
            },
        },
    }
    try:
        resp = _http.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        return base64.b64decode(b64)
    except Exception as error:
        logger.warning("Gemini TTS failed: %s", error)
        return None


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


def _call_gemini(prompt: str, model: Optional[str] = None) -> Optional[CheckAnswerResult]:
    text = _call_gemini_text(prompt, model=model)
    if not text:
        return None
    return _parse_gemini_response(text)


def _call_gemini_text(prompt: str, model: Optional[str] = None) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None

    try:
        # Lazy import — Gemini paketi yetib bormagan muhitda ham app yuklansin.
        import google.generativeai as genai
    except ImportError:
        return None

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model_name = model or settings.GEMINI_MODEL
        gemini_model = genai.GenerativeModel(model_name)
        response = gemini_model.generate_content(
            prompt,
            request_options={"timeout": GEMINI_TIMEOUT_S},
        )
        return (response.text or "").strip()
    except Exception as error:  # noqa: BLE001 — har qanday xatoni fallback bilan jim qoldiramiz
        logger.warning("Gemini call failed (lokal fallback ishlatiladi): %s", error)
        return None


def _build_check_prompt(question: str, correct_answer: str, user_answer: str) -> str:
    return f"""Sen "Zakovat" — O'zbekiston bilim o'yinining aqlli hakamisisan.
Vazifang: foydalanuvchi javobini to'g'ri javob bilan SEMANTIK taqqoslash.
Shaklga emas, MA'NOGA qarab baho ber.

SAVOL: {question}
TO'G'RI JAVOB: {correct_answer}
FOYDALANUVCHI JAVOBI: {user_answer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"correct" — quyidagi holatlarda:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. RAQAM EKVIVALENTLIGI:
   "2026" = "2026-yil" = "2026 yil" = "ikki ming yigirma olti"
   "100" = "yuz" = "100 ta" = "100%"

2. INSON ISMI VARIANTLARI:
   "Navoiy" = "Alisher Navoiy" = "Mir Alisher Navoiy"
   "Temur" = "Amir Temur" = "Temurbek" = "Sohibqiron" = "Timur"
   "Pushkin" = "Aleksandr Pushkin" = "A. Pushkin"

3. JOY NOMI VARIANTLARI:
   "Toshkent" = "toshkent" = "Toshkent shahri"
   "O'zbekiston" = "O'zbekiston Respublikasi" = "Uzbekistan"
   "AQSh" = "Amerika" = "Amerika Qo'shma Shtatlari" = "USA"

4. QISQARTMALAR VA TO'LIQ NOMLAR:
   "BMT" = "Birlashgan Millatlar Tashkiloti" = "UN"
   "FIFA" = "Xalqaro futbol federatsiyasi"

5. QISQACHA TO'G'RI JAVOB:
   To'g'ri javob: "Navoiy" — Foydalanuvchi: "Alisher Navoiy shoir" → correct
   To'g'ri javob: "2026" — Foydalanuvchi: "bu yil 2026 yil" → correct

6. IMLO FARQLARI (ahamiyatsiz):
   Katta/kichik harf, qo'shimcha tinish belgilari, "o'" va "o", "g'" va "g"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"partial" — FAQAT shu hollarda:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Ikkilanish: "2025 yoki 2026", "Temurmi yoki Navoiy?"
• To'g'ri qism bor, lekin noto'g'ri qo'shimcha: "Navoiy va Bobur" (faqat Navoiy to'g'ri edi)
• Juda umumiy: To'g'ri:"Navoiy" / Javob:"O'zbek shoiri" (shaxs nomi yo'q)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"incorrect" — FAQAT shu hollarda:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Butunlay boshqa javob (2025 ≠ 2026)
• To'g'ri javobga aloqasi yo'q

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAQAT JSON qaytar, boshqa hech narsa yozma:
{{"status":"correct"|"partial"|"incorrect","explanation":"O'zbek tilida 1 qisqa gap"}}"""


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
