"""Questions jadval repositoriy qatlami."""
from __future__ import annotations

import random
from typing import Any

from apps.core.exceptions import AppError
from apps.core.supabase_client import table


QUESTION_COLUMNS_PUBLIC = "id, text, category, difficulty"
QUESTION_COLUMNS_FULL = "id, text, correct_answer, category, difficulty"


def _map_question_public(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "text": row.get("text"),
        "category": row.get("category"),
        "difficulty": row.get("difficulty"),
    }


def _map_question_full(row: dict[str, Any]) -> dict[str, Any]:
    base = _map_question_public(row)
    base["correctAnswer"] = row.get("correct_answer")
    return base


def get_round_questions(*, count: int, category: str | None, difficulty: str | None) -> list[dict[str, Any]]:
    query = table("questions").select("id")
    if category:
        query = query.eq("category", category)
    if difficulty:
        query = query.eq("difficulty", difficulty)

    id_result = query.execute()
    if id_result["error"]:
        raise AppError(500, "Question ids lookup failed")

    ids = [row["id"] for row in id_result["data"] or []]
    random.shuffle(ids)
    ids = ids[:count]

    if not ids:
        return []

    fetch_result = (
        table("questions")
        .select(QUESTION_COLUMNS_PUBLIC)
        .in_("id", ids)
        .execute()
    )

    if fetch_result["error"]:
        raise AppError(500, "Round questions lookup failed")

    rows = [_map_question_public(row) for row in fetch_result["data"] or []]
    random.shuffle(rows)
    return rows


def get_categories() -> list[str]:
    result = table("questions").select("category").execute()
    if result["error"]:
        raise AppError(500, "Categories lookup failed")

    categories: set[str] = set()
    for row in result["data"] or []:
        cat = row.get("category")
        if cat:
            categories.add(cat)
    return sorted(categories, key=lambda value: value.lower())


def get_question_by_id(question_id: str) -> dict[str, Any] | None:
    result = (
        table("questions")
        .select(QUESTION_COLUMNS_FULL)
        .eq("id", question_id)
        .maybe_single()
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Question lookup failed")

    return _map_question_full(result["data"]) if result["data"] else None


def report_question(question_id: str, reported_by: int) -> None:
    result = (
        table("question_reports")
        .insert({"question_id": question_id, "reported_by": reported_by})
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Question report failed")


def get_reported_questions() -> list[dict[str, Any]]:
    reports_result = table("question_reports").select("question_id").execute()
    if reports_result["error"]:
        raise AppError(500, "Reports lookup failed")

    counts: dict[str, int] = {}
    for row in reports_result["data"] or []:
        qid = row.get("question_id")
        if qid:
            counts[qid] = counts.get(qid, 0) + 1

    if not counts:
        return []

    questions_result = (
        table("questions")
        .select(QUESTION_COLUMNS_FULL)
        .in_("id", list(counts.keys()))
        .execute()
    )

    if questions_result["error"]:
        raise AppError(500, "Reported questions lookup failed")

    output = []
    for row in questions_result["data"] or []:
        mapped = _map_question_full(row)
        mapped["reportCount"] = counts.get(row.get("id"), 0)
        output.append(mapped)
    return output


def delete_question(question_id: str) -> None:
    table("question_reports").delete().eq("question_id", question_id).execute()
    result = table("questions").delete().eq("id", question_id).execute()
    if result["error"]:
        raise AppError(500, "Question delete failed")


def count_all() -> int:
    result = table("questions").select("id").with_count("exact").execute()
    if result["error"]:
        raise AppError(500, "Questions count failed")
    return result["count"] or 0


# ---------------- Admin uchun kengaytma ----------------


def create_question(text: str, correct_answer: str, category: str | None, difficulty: str | None) -> None:
    result = (
        table("questions")
        .insert(
            {
                "text": text,
                "correct_answer": correct_answer,
                "category": category,
                "difficulty": difficulty,
            }
        )
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Question create failed")


def bulk_create_questions(items: list[dict[str, Any]]) -> int:
    if not items:
        return 0

    rows = [
        {
            "text": item["text"],
            "correct_answer": item["correctAnswer"],
            "category": item.get("category"),
            "difficulty": item.get("difficulty"),
        }
        for item in items
    ]

    result = table("questions").insert(rows).select("id").execute()
    if result["error"]:
        raise AppError(500, "Bulk question insert failed")
    return len(result["data"] or [])


def update_question(
    question_id: str,
    *,
    text: str | None = None,
    correct_answer: str | None = None,
    category: str | None = None,
    difficulty: str | None = None,
    unset_category: bool = False,
    unset_difficulty: bool = False,
) -> None:
    update: dict[str, Any] = {}
    if text is not None:
        update["text"] = text
    if correct_answer is not None:
        update["correct_answer"] = correct_answer
    if unset_category:
        update["category"] = None
    elif category is not None:
        update["category"] = category
    if unset_difficulty:
        update["difficulty"] = None
    elif difficulty is not None:
        update["difficulty"] = difficulty

    if not update:
        return

    result = table("questions").update(update).eq("id", question_id).execute()
    if result["error"]:
        raise AppError(500, "Question update failed")


def list_all_questions(
    *,
    search: str | None,
    category: str | None,
    difficulty: str | None,
    limit: int,
    offset: int,
) -> dict[str, Any]:
    query = table("questions").select(QUESTION_COLUMNS_FULL).with_count("exact")

    if category:
        query = query.eq("category", category)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    if search:
        escaped = search.replace("%", r"\%").replace("_", r"\_")
        query = query.ilike("text", f"%{escaped}%")

    result = (
        query.order("text", ascending=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Questions list failed")

    return {
        "items": [_map_question_full(row) for row in result["data"] or []],
        "total": result["count"] or 0,
    }


def get_category_stats() -> list[dict[str, Any]]:
    result = table("questions").select("category").execute()
    if result["error"]:
        raise AppError(500, "Category stats failed")

    counts: dict[str, int] = {}
    for row in result["data"] or []:
        cat = row.get("category")
        if cat:
            counts[cat] = counts.get(cat, 0) + 1

    return sorted(
        ({"category": name, "count": count} for name, count in counts.items()),
        key=lambda item: item["count"],
        reverse=True,
    )


def rename_category(old_name: str, new_name: str) -> int:
    result = (
        table("questions")
        .update({"category": new_name})
        .eq("category", old_name)
        .select("id")
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Category rename failed")
    return len(result["data"] or [])
