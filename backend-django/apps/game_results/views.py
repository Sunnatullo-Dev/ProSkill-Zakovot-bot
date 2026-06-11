from __future__ import annotations

from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError

from . import repositories

# Ball farming himoyasi konstantalari
MAX_TOTAL_COUNT = 20        # Bir o'yinda maksimum savol soni
MAX_ROUND_SCORE_MULTIPLIER = 3   # Har bir savol uchun maksimum ball
MAX_RESULTS_PER_HOUR = 20   # Soatiga maksimum natija
MAX_RESULTS_PER_DAY = 100   # Kuniga maksimum natija


@api_view(["POST"])
@require_auth
def save_result(request):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    correct = _coerce_int(body.get("correctCount"))
    total = _coerce_int(body.get("totalCount"))
    round_score = _coerce_int(body.get("roundScore"))

    # ── 1. Qattiq qiymat chegaralari ─────────────────────────────────────────
    if correct < 0 or total < 0 or round_score < 0:
        raise AppError(400, "Manfiy qiymat berib bo'lmaydi")
    if total < 1 or total > MAX_TOTAL_COUNT:
        raise AppError(400, f"totalCount 1 dan {MAX_TOTAL_COUNT} gacha bo'lishi kerak")
    if correct > total:
        raise AppError(400, "correctCount totalCount dan katta bo'la olmaydi")
    # Max 3 ball/savol (tez + streak bonus). Bundan yuqori — cheating.
    if round_score > total * MAX_ROUND_SCORE_MULTIPLIER:
        raise AppError(400, "roundScore mumkin bo'lgan maksimaldan oshib ketdi")

    # ── 2. Soatiga rate limit ─────────────────────────────────────────────────
    hour_key = f"gr_hour:{user.telegram_id}"
    hour_count = cache.get(hour_key, 0)
    if hour_count >= MAX_RESULTS_PER_HOUR:
        raise AppError(429, "Soatiga juda ko'p natija saqlandi, keyinroq urinib ko'ring")
    cache.set(hour_key, hour_count + 1, timeout=3600)

    # ── 3. Kuniga rate limit ──────────────────────────────────────────────────
    day_key = f"gr_day:{user.telegram_id}"
    day_count = cache.get(day_key, 0)
    if day_count >= MAX_RESULTS_PER_DAY:
        raise AppError(429, "Bugun juda ko'p natija saqlandi, ertaga urinib ko'ring")
    cache.set(day_key, day_count + 1, timeout=86400)

    repositories.create_game_result(user.telegram_id, correct, total, round_score)
    return Response({"ok": True}, status=201)


@api_view(["GET"])
@require_auth
def get_stats(request):
    user = request.current_user
    return Response({"stats": repositories.get_stats(user.telegram_id)})


@api_view(["GET"])
@require_auth
def get_history(request):
    user = request.current_user
    limit = min(50, max(1, int(request.query_params.get("limit", 20))))
    results = repositories.get_history(user.telegram_id, limit=limit)
    return Response({"results": results})


def _coerce_int(raw) -> int:
    if raw is None:
        raise AppError(400, "Maydon to'ldirilishi shart")
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise AppError(400, "Raqam kutilgan")
