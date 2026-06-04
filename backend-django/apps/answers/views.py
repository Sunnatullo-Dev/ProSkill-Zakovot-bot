"""Answer API endpointlari — /api/answer/*.

POST /ticket  → savol uchun imzolangan bilet chiqaradi
POST /        → biletni tekshirib, javobni baholaydi va ball beradi
POST /reveal  → "Javobni bilmayman" tugmasi uchun to'g'ri javob va izoh

Replay attack himoyasi: har biletda noyob `jti` bor, submit'da
`consume_answer_ticket` orqali "ishlatilgan" deb belgilanadi.
"""
from __future__ import annotations

import hashlib
import re
import time

from django.db import transaction
from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError
from apps.questions.repositories import get_question_by_id
from apps.users.repositories import add_score, deduct_score_if_sufficient

from .gemini import check_answer, explain_question, generate_tts
from .models import TtsCache
from .grading import GradingResult, exact_match_grade
from .scoring import ScoreInput, calculate_answer_score
from .tickets import consume_answer_ticket, issue_answer_ticket, verify_answer_ticket


ANSWER_TIMEOUT_MS = 15_000
TIMEOUT_GRACE_MS = 2_000
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def _rate_key(group: str, request) -> str:
    """Rate-limit user-id bo'yicha (mavjud bo'lsa), aks holda IP."""
    user = getattr(request, "current_user", None)
    if user and getattr(user, "telegram_id", 0) > 0:
        return f"u:{user.telegram_id}"
    return f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"


@api_view(["POST"])
@require_auth
@ratelimit(key=_rate_key, rate="60/m", block=True)
def issue_ticket(request):
    body = request.data if isinstance(request.data, dict) else {}
    question_id = body.get("questionId")

    if not isinstance(question_id, str) or not UUID_RE.match(question_id):
        raise AppError(400, "questionId noto'g'ri")

    return Response({"ticket": issue_answer_ticket(question_id)})


@api_view(["POST"])
@require_auth
@ratelimit(key=_rate_key, rate="60/m", block=True)
def submit_answer(request):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    ticket = body.get("ticket")
    if not isinstance(ticket, str) or not ticket:
        raise AppError(400, "ticket talab qilinadi")

    user_answer_raw = body.get("userAnswer", "")
    if not isinstance(user_answer_raw, str):
        user_answer_raw = ""
    user_answer = user_answer_raw.strip()

    streak_raw = body.get("streak", 0)
    try:
        streak_before = max(0, int(streak_raw))
    except (TypeError, ValueError):
        raise AppError(400, "streak noto'g'ri")

    # Svoyak bet — ixtiyoriy. Faqat 5/10/20/50 qiymatlar qabul qilinadi.
    VALID_BETS = {5, 10, 20, 50}
    bet_amount = 0
    bet_raw = body.get("betAmount")
    if bet_raw is not None:
        try:
            bet_amount = int(bet_raw)
        except (TypeError, ValueError):
            raise AppError(400, "betAmount noto'g'ri")
        if bet_amount != 0 and bet_amount not in VALID_BETS:
            raise AppError(400, "betAmount faqat 5, 10, 20 yoki 50 bo'lishi mumkin")

    payload = verify_answer_ticket(ticket)

    # Avval savol mavjudligini tekshiramiz — agar savol o'chirilgan bo'lsa
    # (admin uni "noto'g'ri" deb belgilab o'chirgan), biletni "consumed"
    # qilish o'rinli emas. Foydalanuvchi keyingi safar uringanda javob bera
    # olishi mumkin (yangi ticket bilan).
    question = get_question_by_id(payload.question_id)
    if not question:
        raise AppError(404, "Savol topilmadi")

    # Replay himoyasi: biletni ishlatilgan deb belgilashga urinamiz —
    # allaqachon ishlatilgan bo'lsa, takror jorayotgan bo'ladi.
    if not consume_answer_ticket(payload.jti):
        raise AppError(409, "Bu bilet allaqachon ishlatilgan")

    # Bet tikish: bilet consumed bo'lgandan keyin (replay himoyasi o'tgach)
    # atomik ravishda balansdan yechib olamiz. Yetarli bo'lmasa — rad etiladi.
    if bet_amount > 0:
        if not deduct_score_if_sufficient(user.telegram_id, bet_amount):
            raise AppError(400, "Yetarli ballingiz yo'q")

    now_ms = int(time.time() * 1000)
    time_taken = max(0, now_ms - payload.issued_at_ms)

    if time_taken > ANSWER_TIMEOUT_MS + TIMEOUT_GRACE_MS:
        return Response(
            {
                "status": "incorrect",
                "isCorrect": False,
                "explanation": "Vaqt tugadi",
                "correctAnswer": question["correctAnswer"],
                "pointsEarned": 0,
                "streak": 0,
            }
        )

    # A/B/C/D rejimi: savolda noto'g'ri variantlar bo'lsa Gemini'ga
    # bormaymiz — darrov aniq taqqoslash bilan baholaymiz. Bu:
    #   - tezroq (10s emas <100ms)
    #   - bepul (Gemini API chaqiruvi yo'q)
    #   - aniqroq (AI "qisman to'g'ri" deb adashmaydi)
    wrong_answers = question.get("wrongAnswers") or []
    if wrong_answers:
        # Foydalanuvchi yuborgan javob — taqdim etilgan variantlardan biri
        # bo'lishi kerak (xavfsizlik tekshiruvi: xohlagan matnni baholatmasin).
        all_options = [question["correctAnswer"], *wrong_answers]
        normalized_options = {opt.strip().casefold() for opt in all_options if isinstance(opt, str)}
        if user_answer.casefold() not in normalized_options:
            return Response(
                {
                    "status": "incorrect",
                    "isCorrect": False,
                    "explanation": "Noto'g'ri variant tanlandi",
                    "correctAnswer": question["correctAnswer"],
                    "pointsEarned": 0,
                    "streak": 0,
                }
            )
        grading = exact_match_grade(user_answer, question["correctAnswer"])
    else:
        # Eski yo'l: erkin matn → Gemini AI baholaydi.
        grading = check_answer(question["text"], question["correctAnswer"], user_answer)
    score = calculate_answer_score(
        ScoreInput(
            status=grading.status,
            time_taken_ms=min(time_taken, ANSWER_TIMEOUT_MS),
            streak_before=streak_before,
        )
    )

    # Normal o'yin bali (streak + tezlik mukofoti)
    if score.points_earned > 0:
        with transaction.atomic():
            add_score(user.telegram_id, score.points_earned)

    # Svoyak bet natijasi: to'g'ri → 2× bet qaytariladi (net +bet), noto'g'ri → ball ketdi
    bet_won = 0
    if bet_amount > 0:
        if grading.status == "correct":
            add_score(user.telegram_id, 2 * bet_amount)
            bet_won = bet_amount
        else:
            bet_won = -bet_amount

    return Response(
        {
            "status": grading.status,
            "isCorrect": grading.status == "correct",
            "explanation": grading.explanation,
            "correctAnswer": question["correctAnswer"],
            "pointsEarned": score.points_earned,
            "streak": score.streak_after,
            "betAmount": bet_amount,
            "betWon": bet_won,
        }
    )


@api_view(["POST"])
@require_auth
@ratelimit(key=_rate_key, rate="30/m", block=True)
def tts(request):
    import base64

    body = request.data if isinstance(request.data, dict) else {}
    text = body.get("text", "")
    if not isinstance(text, str) or not text.strip():
        raise AppError(400, "text talab qilinadi")

    text = text.strip()[:600]
    text_hash = hashlib.sha256(text.encode()).hexdigest()

    # Keshdan olish — jadval hali yaratilmagan bo'lsa (migration kutilmoqda) o'tkazib yuboramiz
    try:
        cached = TtsCache.objects.filter(text_hash=text_hash).first()
        if cached:
            return Response({"audio": cached.audio_b64, "mimeType": "audio/wav"})
    except Exception:
        pass

    audio_bytes = generate_tts(text)
    if audio_bytes is None:
        raise AppError(503, "TTS vaqtincha mavjud emas")

    audio_b64 = base64.b64encode(audio_bytes).decode()
    try:
        TtsCache.objects.get_or_create(text_hash=text_hash, defaults={"audio_b64": audio_b64})
    except Exception:
        pass  # Kesh saqlanmasa ham audio qaytariladi

    return Response({"audio": audio_b64, "mimeType": "audio/wav"})


@api_view(["POST"])
@require_auth
@ratelimit(key=_rate_key, rate="20/m", block=True)
def reveal_answer(request):
    body = request.data if isinstance(request.data, dict) else {}
    ticket = body.get("ticket")
    if not isinstance(ticket, str) or not ticket:
        raise AppError(400, "ticket talab qilinadi")

    payload = verify_answer_ticket(ticket)
    question = get_question_by_id(payload.question_id)
    if not question:
        raise AppError(404, "Question not found")

    # Reveal'da ham biletni "consumed" deb belgilaymiz — Gemini'ni qaytadan
    # so'rab kvota yoqib bo'lmasin. Submit endpoint'i ham shu jti'ni rad etadi.
    # Agar bilet allaqachon ishlatilgan bo'lsa (masalan, submit_answer chaqirilgan),
    # 409 qaytaramiz — Gemini API chaqirilmaydi.
    if not consume_answer_ticket(payload.jti):
        raise AppError(409, "Bu bilet allaqachon ishlatilgan")

    explanation = explain_question(question["text"], question["correctAnswer"])
    return Response({"correctAnswer": question["correctAnswer"], "explanation": explanation})
