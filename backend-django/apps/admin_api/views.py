"""Admin API endpointlari — /api/admin/*.

Hammasi `@require_admin` himoyasi ostida (ADMIN_TELEGRAM_IDS env'da ko'rsatilgan
foydalanuvchilarga ruxsat). Eski `backend/src/controllers/admin.controller.ts`
ning aniq nusxasi.
"""
from __future__ import annotations

import re

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin
from apps.core.exceptions import AppError
from apps.core.supabase_client import table
from apps.game_results.repositories import count_all as count_game_results
from apps.questions import repositories as question_repo
from apps.users.repositories import count_all as count_users


MAX_PAGE_LIMIT = 50
DEFAULT_PAGE_LIMIT = 20
BULK_LIMIT = 500
UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _safe_count(callable_) -> int:
    try:
        return callable_()
    except Exception as error:  # noqa: BLE001
        print(f"admin stat count failed: {error}")
        return 0


def _supabase_count(table_name: str) -> int:
    result = table(table_name).select("id").with_count("exact").execute()
    if result["error"]:
        raise AppError(500, f"{table_name} count failed")
    return result["count"] or 0


def _validate_uuid(value: str | None) -> str:
    if not isinstance(value, str) or not UUID_RE.match(value):
        raise AppError(400, "Savol ID noto'g'ri")
    return value


def _coerce_difficulty(raw, *, allow_null: bool = True):
    if raw is None or raw == "":
        if allow_null:
            return None
        raise AppError(400, "Qiyinlik kerak")
    if raw not in VALID_DIFFICULTIES:
        raise AppError(400, "Qiyinlik 'easy' | 'medium' | 'hard'")
    return raw


def _coerce_text(raw, *, min_len: int, field: str) -> str:
    if not isinstance(raw, str):
        raise AppError(400, f"{field} kerak")
    trimmed = raw.strip()
    if len(trimmed) < min_len:
        raise AppError(400, f"{field} juda qisqa")
    return trimmed


@api_view(["GET"])
@require_admin
def get_stats(request):
    users_count = _safe_count(count_users)
    questions_count = _safe_count(question_repo.count_all)
    categories_stats = _safe_count_list(question_repo.get_category_stats)
    games_count = _safe_count(count_game_results)
    battles_count = _safe_count(lambda: _supabase_count("battle_challenges"))
    teams_count = _safe_count(lambda: _supabase_count("teams"))

    return Response(
        {
            "users": users_count,
            "questions": questions_count,
            # Foydalanuvchi takliflari tizimi olib tashlangan — javob shaklini saqlash uchun
            # frontend hisoblay olishi mumkin bo'lgan nol qiymatlar qaytaramiz.
            "submissions": {"pending": 0, "approved": 0, "rejected": 0},
            "categories": categories_stats,
            "games": games_count,
            "battles": battles_count,
            "teams": teams_count,
        }
    )


def _safe_count_list(callable_):
    try:
        return callable_()
    except Exception as error:  # noqa: BLE001
        print(f"admin stat list failed: {error}")
        return []


@api_view(["GET", "POST"])
@require_admin
def questions_collection(request):
    """GET = pagination ro'yxati, POST = yangi savol yaratish."""
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        text = _coerce_text(body.get("text"), min_len=3, field="Savol matni")
        correct_answer = _coerce_text(body.get("correctAnswer"), min_len=1, field="Javob")

        category = body.get("category")
        if isinstance(category, str):
            category = category.strip() or None
        elif category is not None:
            raise AppError(400, "Kategoriya noto'g'ri")

        difficulty = _coerce_difficulty(body.get("difficulty"))

        question_repo.create_question(text, correct_answer, category, difficulty)
        return Response({"ok": True}, status=201)

    # GET
    params = request.query_params
    search = (params.get("search") or "").strip() or None
    category_filter = (params.get("category") or "").strip() or None

    difficulty_raw = (params.get("difficulty") or "").strip() or None
    if difficulty_raw is not None and difficulty_raw not in VALID_DIFFICULTIES:
        raise AppError(400, "Qiyinlik noto'g'ri")

    try:
        page = max(1, int(params.get("page") or 1))
    except ValueError:
        raise AppError(400, "page noto'g'ri")

    try:
        limit_raw = int(params.get("limit") or DEFAULT_PAGE_LIMIT)
    except ValueError:
        raise AppError(400, "limit noto'g'ri")
    limit = max(1, min(MAX_PAGE_LIMIT, limit_raw))

    offset = (page - 1) * limit
    result = question_repo.list_all_questions(
        search=search,
        category=category_filter,
        difficulty=difficulty_raw,
        limit=limit,
        offset=offset,
    )

    return Response(
        {"items": result["items"], "total": result["total"], "page": page, "limit": limit}
    )


@api_view(["POST"])
@require_admin
def bulk_create_questions(request):
    body = request.data if isinstance(request.data, dict) else {}
    items_raw = body.get("questions")

    if not isinstance(items_raw, list) or not items_raw:
        raise AppError(400, "Hech bo'lmaganda bitta savol bo'lishi kerak")
    if len(items_raw) > BULK_LIMIT:
        raise AppError(400, f"Maksimum {BULK_LIMIT} ta savol")

    cleaned = []
    for index, item in enumerate(items_raw):
        if not isinstance(item, dict):
            raise AppError(400, f"#{index + 1}: noto'g'ri obyekt")
        cleaned.append(
            {
                "text": _coerce_text(item.get("text"), min_len=3, field=f"#{index + 1} savol matni"),
                "correctAnswer": _coerce_text(
                    item.get("correctAnswer"), min_len=1, field=f"#{index + 1} javob"
                ),
                "category": (item.get("category") or "").strip() or None
                if isinstance(item.get("category"), str)
                else item.get("category"),
                "difficulty": _coerce_difficulty(item.get("difficulty")),
            }
        )

    inserted = question_repo.bulk_create_questions(cleaned)
    return Response({"ok": True, "inserted": inserted}, status=201)


@api_view(["PATCH", "DELETE"])
@require_admin
def question_detail(request, question_id: str):
    """PATCH = tahrirlash, DELETE = o'chirish."""
    question_id = _validate_uuid(question_id)

    if request.method == "DELETE":
        question_repo.delete_question(question_id)
        return Response({"ok": True})

    body = request.data if isinstance(request.data, dict) else {}

    text = None
    if "text" in body:
        text = _coerce_text(body.get("text"), min_len=3, field="Savol matni")

    correct_answer = None
    if "correctAnswer" in body:
        correct_answer = _coerce_text(body.get("correctAnswer"), min_len=1, field="Javob")

    unset_category = False
    category = None
    if "category" in body:
        raw = body.get("category")
        if raw is None:
            unset_category = True
        elif isinstance(raw, str):
            stripped = raw.strip()
            if stripped:
                category = stripped
            else:
                unset_category = True
        else:
            raise AppError(400, "Kategoriya noto'g'ri")

    unset_difficulty = False
    difficulty = None
    if "difficulty" in body:
        raw = body.get("difficulty")
        if raw is None or raw == "":
            unset_difficulty = True
        else:
            difficulty = _coerce_difficulty(raw, allow_null=False)

    question_repo.update_question(
        question_id,
        text=text,
        correct_answer=correct_answer,
        category=category,
        difficulty=difficulty,
        unset_category=unset_category,
        unset_difficulty=unset_difficulty,
    )
    return Response({"ok": True})


@api_view(["GET"])
@require_admin
def list_categories(request):
    return Response({"items": question_repo.get_category_stats()})


@api_view(["POST"])
@require_admin
def rename_category(request):
    body = request.data if isinstance(request.data, dict) else {}
    old_name = (body.get("oldName") or "").strip()
    new_name = (body.get("newName") or "").strip()

    if not old_name or not new_name:
        raise AppError(400, "Eski va yangi nom kerak")
    if old_name == new_name:
        raise AppError(400, "Yangi nomi eski nomidan farq qilishi kerak")

    updated = question_repo.rename_category(old_name, new_name)
    return Response({"ok": True, "updatedCount": updated})
