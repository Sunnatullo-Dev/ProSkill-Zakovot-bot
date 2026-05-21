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
