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
from apps.users.repositories import add_score, deduct_score_if_sufficient, get_streak, set_streak

from .gemini import check_answer, explain_question, generate_tts
from .models import TtsCache
from .grading import GradingResult, exact_match_grade
from .scoring import ScoreInput, calculate_answer_score
from .tickets import consume_answer_ticket, issue_answer_ticket, verify_answer_ticket


DEFAULT_ANSWER_TIMEOUT_MS = 15_000   # savol darajasida qiymat yo'q bo'lsa
# Grace: tarmoq kechikishi (≤1s) + TTS o'ynatish vaqti (2-5s).
# Bilet TTS dan OLDIN chiqariladi, shuning uchun server tomonidagi
# o'lchangan vaqt: TTS_dur + savol_vaqti. 10s xavfsiz marja.
TIMEOUT_GRACE_MS          = 10_000

VALID_BETS = frozenset({5, 10, 20, 50})

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def _rate_key(group: str, request) -> str:
    """Rate-limit user-id bo'yicha (mavjud bo'lsa), aks holda IP."""
    user = getattr(request, "current_user", None)
    if user and getattr(user, "telegram_id", 0) > 0:
        return f"u:{user.telegram_id}"
    return f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"


def _timeout_response(correct_answer: str) -> Response:
    """Vaqt tugaganda qaytariladigan javob — bet YECHILMAYDI."""
    return Response({
        "status": "incorrect",
        "isCorrect": False,
        "explanation": "Vaqt tugadi",
        "correctAnswer": correct_answer,
        "pointsEarned": 0,
        "streak": 0,
        "betAmount": 0,
        "betWon": 0,
    })


def _invalid_option_response(correct_answer: str, bet_amount: int) -> Response:
    """A/B/C/D rejimida noto'g'ri/buzilgan variant yuborilganda.
    Bet yechilgan (xavfsizlik: foydalanuvchi ruxsatsiz javob yubordi) → qaytarilmaydi.
    """
    return Response({
        "status": "incorrect",
        "isCorrect": False,
        "explanation": "Noto'g'ri variant tanlandi",
        "correctAnswer": correct_answer,
        "pointsEarned": 0,
        "streak": 0,
        "betAmount": bet_amount,
        "betWon": -bet_amount if bet_amount > 0 else 0,
    })


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

    # ── 1. Kiruvchi ma'lumotlarni tekshirish ──────────────────────────────────

    ticket = body.get("ticket")
    if not isinstance(ticket, str) or not ticket:
        raise AppError(400, "ticket talab qilinadi")

    user_answer_raw = body.get("userAnswer", "")
    if not isinstance(user_answer_raw, str):
        user_answer_raw = ""
    user_answer = user_answer_raw.strip()

    streak_before = get_streak(user.telegram_id)

    # Svoyak bet — ixtiyoriy. Faqat 0 | 5 | 10 | 20 | 50 qabul qilinadi.
    bet_amount = 0
    bet_raw = body.get("betAmount")
    if bet_raw is not None:
        try:
            bet_amount = int(bet_raw)
        except (TypeError, ValueError):
            raise AppError(400, "betAmount noto'g'ri")
        if bet_amount < 0 or (bet_amount != 0 and bet_amount not in VALID_BETS):
            raise AppError(400, "betAmount faqat 0 | 5 | 10 | 20 | 50 bo'lishi mumkin")

    # ── 2. Bilet tekshiruvi ───────────────────────────────────────────────────

    payload = verify_answer_ticket(ticket)

    # Savol mavjudligini consume'dan oldin tekshiramiz — o'chirilgan savol
    # uchun bilet sarf bo'lmasin, foydalanuvchi qaytadan urinishi mumkin.
    question = get_question_by_id(payload.question_id)
    if not question:
        raise AppError(404, "Savol topilmadi")

    # Replay himoyasi: biletni ishlatilgan deb belgilaymiz.
    if not consume_answer_ticket(payload.jti):
        raise AppError(409, "Bu bilet allaqachon ishlatilgan")

    # ── 3. Vaqt tekshiruvi — BET YECHILMASDAN OLDIN ─────────────────────────
    # MUHIM: vaqt tugaganda bet yechilmasligi kerak — foydalanuvchi vaqtida
    # javob berganda tarmoq kechikishi sababli serverda late arrive bo'lishi
    # mumkin. Shu holda uni jazolamaslik uchun, avval vaqtni hisoblaymiz.

    now_ms = int(time.time() * 1000)
    time_taken_ms = max(0, now_ms - payload.issued_at_ms)

    # Savol darajasidagi vaqt limiti — NULL bo'lsa standart 15s ishlatiladi
    question_time_limit_ms = int(question.get("timeLimitSeconds") or 90) * 1000
    if time_taken_ms > question_time_limit_ms + TIMEOUT_GRACE_MS:
        set_streak(user.telegram_id, 0)
        return _timeout_response(question["correctAnswer"])

    # ── 4. Bet yechish — vaqt o'tmaganligiga ishonch hosil bo'lgandan keyin ──
    # Atomik: score >= bet_amount bo'lmasagina yechilmaydi.
    if bet_amount > 0:
        if not deduct_score_if_sufficient(user.telegram_id, bet_amount):
            raise AppError(400, "Yetarli ballingiz yo'q")

    # ── 5. Javob baholash ─────────────────────────────────────────────────────

    wrong_answers = question.get("wrongAnswers") or []
    if wrong_answers:
        # A/B/C/D rejimi: faqat taqdim etilgan variantlardan biri qabul.
        # Buzilgan ma'lumot yuborilsa → bet qaytarilmaydi (xavfsizlik).
        all_options = [question["correctAnswer"], *wrong_answers]
        valid_set = {opt.strip().casefold() for opt in all_options if isinstance(opt, str)}
        if user_answer.casefold() not in valid_set:
            set_streak(user.telegram_id, 0)
            return _invalid_option_response(question["correctAnswer"], bet_amount)
        grading = exact_match_grade(user_answer, question["correctAnswer"])
    else:
        # Erkin matn: Gemini AI baholaydi.
        grading = check_answer(question["text"], question["correctAnswer"], user_answer)

    # ── 6. Ball hisoblash ─────────────────────────────────────────────────────

    score = calculate_answer_score(
        ScoreInput(
            status=grading.status,
            time_taken_ms=min(time_taken_ms, question_time_limit_ms),
            streak_before=streak_before,
        )
    )

    # Svoyak: to'g'ri → net +bet_amount (2× qaytariladi, biri allaqachon yechilgan)
    #         noto'g'ri/partial → net -bet_amount (yechilgan, qaytarilmaydi)
    bet_won = 0
    if bet_amount > 0:
        bet_won = bet_amount if grading.status in ("correct", "partial") else -bet_amount

    # ── 7. Ball va streak yozish — bitta atomik tranzaksiyada ───────────────────
    # Server-side cap: bir javob uchun max 3 ball (tez+streak bonus), bet bundan tashqari.
    capped_points = min(score.points_earned, 3)
    total_add = capped_points + (2 * bet_amount if bet_won > 0 else 0)
    with transaction.atomic():
        if total_add > 0:
            add_score(user.telegram_id, total_add)
        set_streak(user.telegram_id, score.streak_after)

    # ── 8. Daily javobni yozish (bu savol daily topshiriqqa tegishli bo'lsa) ───
    _maybe_record_daily_answer(
        telegram_id=user.telegram_id,
        question_id=payload.question_id,
        is_correct=(grading.status == "correct"),
        points_earned=score.points_earned,
    )

    return Response({
        "status": grading.status,
        "isCorrect": grading.status in ("correct", "partial"),
        "explanation": grading.explanation,
        "correctAnswer": question["correctAnswer"],
        "pointsEarned": capped_points,
        "streak": score.streak_after,
        "betAmount": bet_amount,
        "betWon": bet_won,
    })


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


def _maybe_record_daily_answer(
    telegram_id: int,
    question_id: str,
    is_correct: bool,
    points_earned: int,
) -> None:
    """Savol bugungi daily topshiriqqa tegishli bo'lsa DailyAnswer'ga yozadi."""
    try:
        from apps.daily.repositories import get_today_question_ids, record_daily_answer
        if question_id in get_today_question_ids():
            record_daily_answer(telegram_id, question_id, is_correct, points_earned)
    except Exception:
        pass
