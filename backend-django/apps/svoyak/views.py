"""Svoyak REST endpoint'lari."""
from __future__ import annotations

from django.db.models import Count
from django_ratelimit.decorators import ratelimit
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth
from apps.core.exceptions import AppError

from . import repositories
from .models import SvoyakCategory


# ─── Public catalog ─────────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def list_categories(request):
    """Aktiv kategoriyalar ro'yxati — har birida nechta savol borligi bilan.

    Host xona yaratishidan oldin qaysi kategoriyalarni tanlashni biladi.
    """
    cats = (
        SvoyakCategory.objects.filter(is_active=True)
        .annotate(question_count=Count("questions", distinct=True))
        .order_by("order", "name")
    )
    items = [
        {
            "id": c.id,
            "name": c.name,
            "iconEmoji": c.icon_emoji,
            "language": c.language,
            "questionCount": c.question_count,
            # Har bal qiymatida kamida 1 ta savol bormi (room yaratish uchun shart)
            "ready": c.question_count >= 5,
        }
        for c in cats
    ]
    return Response({"items": items})


def _rate_key(group: str, request) -> str:
    user = getattr(request, "current_user", None)
    if user and getattr(user, "telegram_id", 0) > 0:
        return f"u:{user.telegram_id}"
    return f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"


# ─── Room CRUD ──────────────────────────────────────────────────────────────

@api_view(["POST"])
@require_auth
def create_room(request):
    user = request.current_user

    body = request.data if isinstance(request.data, dict) else {}

    display_name = (body.get("displayName") or "").strip() or f"Host #{user.telegram_id}"
    category_ids = body.get("categoryIds")  # ixtiyoriy — bo'sh bo'lsa auto rejim
    settings_obj = body.get("settings") if isinstance(body.get("settings"), dict) else {}

    cleaned_ids: list[int] = []
    if isinstance(category_ids, list) and category_ids:
        try:
            cleaned_ids = [int(c) for c in category_ids]
        except (TypeError, ValueError):
            raise AppError(400, "categoryIds raqamlar ro'yxati bo'lishi kerak")

    room = repositories.create_room(
        host_telegram_id=user.telegram_id,
        host_display_name=display_name,
        category_ids=cleaned_ids or None,
        settings=settings_obj,
    )
    return Response(room, status=201)


@api_view(["POST"])
@require_auth
def join_room(request, code: str):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    display_name = (body.get("displayName") or "").strip()
    role = body.get("role", "player")
    if role not in ("player", "coordinator"):
        role = "player"
    state = repositories.join_room(
        code=code,
        telegram_id=user.telegram_id,
        display_name=display_name,
        role=role,
    )
    return Response(state)


@api_view(["DELETE"])
@require_auth
def leave_room(request, code: str):
    user = request.current_user
    repositories.leave_room(code=code, telegram_id=user.telegram_id)
    return Response({"ok": True})


@api_view(["GET"])
@require_auth
def get_state(request, code: str):
    user = request.current_user
    state = repositories.get_room_state(code, viewer_telegram_id=user.telegram_id)
    return Response(state)


# ─── O'yin mexanikasi ──────────────────────────────────────────────────────

@api_view(["POST"])
@require_auth
def start_game(request, code: str):
    user = request.current_user
    state = repositories.start_game(code=code, telegram_id=user.telegram_id)
    return Response(state)


@api_view(["POST"])
@require_auth
def pick_question(request, code: str):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    try:
        category_id = int(body.get("categoryId"))
        value_tier = int(body.get("valueTier"))
    except (TypeError, ValueError):
        raise AppError(400, "categoryId va valueTier raqam bo'lishi kerak")
    state = repositories.pick_question(
        code=code,
        telegram_id=user.telegram_id,
        category_id=category_id,
        value_tier=value_tier,
    )
    return Response(state)


@api_view(["POST"])
@require_auth
def open_buzz(request, code: str):
    user = request.current_user
    state = repositories.open_buzz(code=code, telegram_id=user.telegram_id)
    return Response(state)


@api_view(["POST"])
@require_auth
@ratelimit(key=_rate_key, rate="60/m", block=True)
def buzz(request, code: str):
    user = request.current_user
    state = repositories.buzz(code=code, telegram_id=user.telegram_id)
    return Response(state)


@api_view(["POST"])
@require_auth
def submit_answer(request, code: str):
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    answer = body.get("answer") if isinstance(body.get("answer"), str) else ""
    state = repositories.submit_answer(
        code=code,
        telegram_id=user.telegram_id,
        answer_text=answer,
    )
    return Response(state)


@api_view(["POST"])
@require_auth
def skip_round(request, code: str):
    user = request.current_user
    state = repositories.skip_round(code=code, telegram_id=user.telegram_id)
    return Response(state)


@api_view(["POST"])
@require_auth
def end_game(request, code: str):
    user = request.current_user
    state = repositories.end_game(code=code, telegram_id=user.telegram_id)
    return Response(state)


@api_view(["POST"])
@require_auth
@ratelimit(key=_rate_key, rate="60/m", block=True)
def auto_answer(request, code: str):
    """Auto rejim: har qanday o'yinchi javob berishi mumkin (buzz yo'q)."""
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    answer = body.get("answer") if isinstance(body.get("answer"), str) else ""
    state = repositories.submit_auto_answer(
        code=code,
        telegram_id=user.telegram_id,
        answer_text=answer,
    )
    return Response(state)
