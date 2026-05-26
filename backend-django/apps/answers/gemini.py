"""Gemini orqali javob bahosi va savol tushuntirishi."""
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
ANSWER_CHECK_MODEL = "gemini-2.5-flash"
ANSWER_CHECK_MODEL_FALLBACK = "gemini-2.0-flash"

_PUNCTUATION_RE = re.compile(r"[().,!?\-]")
_WHITESPACE_RE = re.compile(r"\s+")

# ─── O'zbek raqam so'zlari lug'ati (kardinal + ordinal formalar) ─────────────

_UZ_ONES = {
    # Kardinal
    "nol": 0, "bir": 1, "ikki": 2, "uch": 3,
    "to'rt": 4, "tort": 4, "besh": 5, "olti": 6,
    "yetti": 7, "sakkiz": 8, "to'qqiz": 9, "toqqiz": 9, "doqqiz": 9,
    # Ordinal (-inchi / -nchi qo'shimchali)
    "birinchi": 1, "ikkinchi": 2, "uchinchi": 3,
    "to'rtinchi": 4, "tortinchi": 4,
    "beshinchi": 5, "oltinchi": 6, "yettinchi": 7,
    "sakkizinchi": 8, "to'qqizinchi": 9, "toqqizinchi": 9,
}
_UZ_TENS = {
    # Kardinal (yozuv xatoliklari bilan)
    "o'n": 10, "on": 10,
    "yigirma": 20, "yigrma": 20, "yigirima": 20,
    "o'ttiz": 30, "ottiz": 30,
    "qirq": 40,
    "ellik": 50,
    "oltmish": 60,
    "yetmish": 70,
    "sakson": 80,
    "to'qson": 90, "toqson": 90,
    # Ordinal
    "o'ninchi": 10, "oninchi": 10,
    "yigirmanchi": 20, "yigrmanchi": 20,
    "o'ttizinchi": 30, "ottizinchi": 30,
    "qirqinchi": 40,
    "ellikinchi": 50,
    "oltmishinchi": 60,
    "yetmishinchi": 70,
    "saksoninchi": 80,
    "to'qsoninchi": 90, "toqsoninchi": 90,
}
_UZ_MULTIPLIERS = {
    "yuz": 100, "yuzinchi": 100,
    "ming": 1000, "minginchi": 1000,
    "million": 1_000_000,
}
_UZ_SKIP_WORDS = {
    "yil", "yilga", "yilda", "yilni", "yili", "yillik",
    "va", "bu", "o'tgan", "shu", "oxirgi",
}


def _uzbek_text_to_number(raw: str) -> Optional[int]:
    """
    O'zbek raqam so'zlarini raqamga aylantiradi.
    "ikki ming yigirma olti"         → 2026
    "ikki ming yigirma oltinchi yil" → 2026
    "ikki ming yigrma oltinchi"      → 2026  (yozuv xatosi bilan)
    Noto'g'ri matnga None qaytaradi.
    """
    words = [w.strip(".,!?\"'-") for w in raw.lower().split()]
    total = 0
    current = 0
    found = False

    for word in words:
        if not word or word in _UZ_SKIP_WORDS:
            continue
        if word in _UZ_MULTIPLIERS:
            mult = _UZ_MULTIPLIERS[word]
            if mult >= 1000:
                current = max(current, 1) * mult
                total += current
                current = 0
            else:           # yuz / yuzinchi
                current = max(current, 1) * mult
            found = True
        elif word in _UZ_ONES:
            current += _UZ_ONES[word]
            found = True
        elif word in _UZ_TENS:
            current += _UZ_TENS[word]
            found = True
        # tanilmagan so'z — o'tkazib yubor

    total += current
    return total if found and total > 0 else None


# ─── Asosiy funksiyalar ───────────────────────────────────────────────────────

@dataclass(frozen=True)
class CheckAnswerResult:
    status: AnswerStatus
    explanation: str


def check_answer(question: str, correct_answer: str, user_answer: str) -> CheckAnswerResult:
    """Gemini 2.5 Flash bilan javobni tekshiradi; ishlamasa aqlli lokal tekshiruv."""
    if not user_answer.strip():
        return CheckAnswerResult(status="incorrect", explanation="")

    prompt = _build_check_prompt(question, correct_answer, user_answer)

    # 1-urinish: gemini-2.5-flash
    result = _call_gemini(prompt, model=ANSWER_CHECK_MODEL)
    if result is not None:
        return result

    # 2-urinish: gemini-2.0-flash (zahira model)
    result = _call_gemini(prompt, model=ANSWER_CHECK_MODEL_FALLBACK)
    if result is not None:
        return result

    # Oxirgi zahira: aqlli lokal tekshiruv
    return _smart_local_check(correct_answer, user_answer)


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


# ─── Prompt ──────────────────────────────────────────────────────────────────

def _build_check_prompt(question: str, correct_answer: str, user_answer: str) -> str:
    return (
        'Sen "Zakovat" bilim o\'yini hakamisisan. FAQAT JSON qaytarasan.\n\n'
        f'Savol: {question}\n'
        f'To\'g\'ri javob: {correct_answer}\n'
        f'Foydalanuvchi javobi: {user_answer}\n\n'
        '"correct" — MA\'NO bir xil bo\'lsa (shakl farqi ahamiyatsiz):\n'
        '  Raqam variantlari:\n'
        '    "2026" = "2026-yil" = "2026 yil" = "ikki ming yigirma olti"\n'
        '    "2026" = "ikki ming yigirma oltinchi yil" (tartib son ham qabul)\n'
        '    "100" = "yuz" = "bir yuz" = "yuzinchi"\n'
        '  Ism variantlari:\n'
        '    "Navoiy" = "Alisher Navoiy" = "Mir Alisher Navoiy"\n'
        '    "Temur" = "Amir Temur" = "Temurbek" = "Sohibqiron"\n'
        '  Joy nomlari:\n'
        '    "Toshkent" = "toshkent" = "Toshkent shahri"\n'
        '    "AQSh" = "Amerika" = "Amerika Qo\'shma Shtatlari"\n'
        '  Imlo xatolari, qo\'shimcha so\'zlar, katta-kichik harf — ahamiyatsiz\n'
        '  To\'g\'ri javob foydalanuvchi javobining ichida bo\'lsa — "correct"\n\n'
        '"partial" — ikkilanish ("yoki", "balki"), juda umumiy javob\n'
        '"incorrect" — faqat butunlay boshqa ma\'no yoki noto\'g\'ri raqam\n\n'
        'FAQAT JSON, boshqa hech narsa yozma:\n'
        '{"status":"correct"|"partial"|"incorrect","explanation":"o\'zbek tilida 1 gap"}'
    )


# ─── Aqlli lokal tekshiruv (Gemini ishlamasa ishga tushadi) ──────────────────

def _smart_local_check(correct_answer: str, user_answer: str) -> CheckAnswerResult:
    """
    Gemini ishlamagan holda ishlaydigan aqlli lokal tekshiruv.
    O'zbek raqam so'zlari, abbreviaturalar va ko'p xil shakllarni taniydi.
    """
    user = _normalize(user_answer)
    correct = _normalize(correct_answer)

    if not user:
        return CheckAnswerResult(status="incorrect", explanation="")

    # 1. Aniq moslik
    if user == correct:
        return CheckAnswerResult(status="correct", explanation="")

    # 2. Bo'shliqsiz solishtirish: "2026 yil" → "2026yil" vs "2026" (o'tmas)
    #    lekin "alishernav" vs "navoiy" ham (o'tmas) — xavfsiz
    user_compact = re.sub(r"\s+", "", user)
    correct_compact = re.sub(r"\s+", "", correct)
    if user_compact == correct_compact:
        return CheckAnswerResult(status="correct", explanation="")

    # 3. To'g'ri javob foydalanuvchi javobida mavjud
    #    "bu yil 2026 yil bo'ldi" ichida "2026" bor
    if len(correct) >= 2 and correct in user:
        return CheckAnswerResult(status="correct", explanation="")

    # 4. Foydalanuvchi javobi to'g'ri javob ichida (qisqartma)
    #    "navoiy" → "alisher navoiy" ichida
    if len(user) >= 3 and user in correct:
        return CheckAnswerResult(status="correct", explanation="")

    # 5. Faqat raqamlarni solishtirish: "2026-yil" → "2026" vs "2026"
    user_digits = re.sub(r"\D", "", user)
    correct_digits = re.sub(r"\D", "", correct)
    if user_digits and correct_digits and len(correct_digits) >= 2 and user_digits == correct_digits:
        return CheckAnswerResult(status="correct", explanation="")

    # 6. O'zbek raqam so'zlari: "ikki ming yigirma olti" → 2026 == "2026"
    user_num = _uzbek_text_to_number(user_answer)
    if user_num is not None and correct_digits and str(user_num) == correct_digits:
        return CheckAnswerResult(status="correct", explanation="")

    # To'g'ri javob ham so'z ko'rinishida bo'lsa (masalan "o'ttiz besh")
    correct_num = _uzbek_text_to_number(correct_answer)
    if correct_num is not None and user_digits and user_digits == str(correct_num):
        return CheckAnswerResult(status="correct", explanation="")

    # Ikkala taraf ham so'z ko'rinishida
    if user_num is not None and correct_num is not None and user_num == correct_num:
        return CheckAnswerResult(status="correct", explanation="")

    # 7. Asosiy so'zlar (4+ harf) taqqoslash
    correct_key = [w for w in correct.split() if len(w) >= 4]
    if correct_key and all(w in user for w in correct_key):
        return CheckAnswerResult(status="correct", explanation="")

    user_key = [w for w in user.split() if len(w) >= 4]
    if user_key and all(w in correct for w in user_key):
        return CheckAnswerResult(status="correct", explanation="")

    return CheckAnswerResult(status="incorrect", explanation="")


# ─── Ichki yordamchilar ───────────────────────────────────────────────────────

def _call_gemini(prompt: str, model: Optional[str] = None) -> Optional[CheckAnswerResult]:
    text = _call_gemini_text(prompt, model=model)
    if not text:
        return None
    return _parse_gemini_response(text)


def _call_gemini_text(prompt: str, model: Optional[str] = None) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai
    except ImportError:
        return None

    model_name = model or settings.GEMINI_MODEL
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(model_name)
        response = gemini_model.generate_content(
            prompt,
            request_options={"timeout": GEMINI_TIMEOUT_S},
        )
        return (response.text or "").strip()
    except Exception as error:
        logger.warning("Gemini [%s] failed: %s", model_name, error)
        return None


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


def _normalize(value: str) -> str:
    lowered = value.lower().strip()
    cleaned = _PUNCTUATION_RE.sub(" ", lowered)
    return _WHITESPACE_RE.sub(" ", cleaned).strip()
