from __future__ import annotations

from typing import Any

from apps.core.exceptions import AppError

from .models import Question, QuestionReport


def _map_question_public(q: Question) -> dict[str, Any]:
    return {
        "id": str(q.id),
        "text": q.text,
        "category": q.category,
        "difficulty": q.difficulty,
    }


def _map_question_full(q: Question) -> dict[str, Any]:
    base = _map_question_public(q)
    base["correctAnswer"] = q.correct_answer
    return base


def get_round_questions(
    *, count: int, category: str | None, difficulty: str | None
) -> list[dict[str, Any]]:
    """Random N ta savol qaytaradi.

    Eski versiya `values_list` orqali butun jadval ID'larini Python xotirasiga
    yuklaydigan edi — savollar soni ko'paysa lineer ko'tariladi. Endi DB tomonida
    `ORDER BY RANDOM() LIMIT N` ishlatamiz: index'siz ham SQLite/Postgres uchun
    bu N kichik bo'lganda samaraliroq.
    """
    if count <= 0:
        return []
    qs = Question.objects.all()
    if category:
        qs = qs.filter(category=category)
    if difficulty:
        qs = qs.filter(difficulty=difficulty)

    # `order_by("?")` — Django'ning portable `RANDOM()` so'rovi.
    questions = list(qs.order_by("?")[:count])
    return [_map_question_public(q) for q in questions]


def get_categories() -> list[str]:
    cats = (
        Question.objects.exclude(category__isnull=True)
        .exclude(category="")
        .values_list("category", flat=True)
        .distinct()
    )
    return sorted(set(cats), key=lambda v: v.lower())


def get_question_by_id(question_id: str) -> dict[str, Any] | None:
    q = Question.objects.filter(id=question_id).first()
    return _map_question_full(q) if q else None


def report_question(question_id: str, reported_by: int) -> None:
    from django.db import IntegrityError

    q = Question.objects.filter(id=question_id).first()
    if not q:
        raise AppError(404, "Savol topilmadi")
    try:
        QuestionReport.objects.create(question=q, reported_by=reported_by)
    except IntegrityError:
        # Duplicate report — silently OK (foydalanuvchi allaqachon belgilagan).
        return


def get_reported_questions() -> list[dict[str, Any]]:
    from django.db.models import Count

    reports = (
        QuestionReport.objects.values("question_id")
        .annotate(report_count=Count("id"))
    )
    if not reports:
        return []
    counts = {str(r["question_id"]): r["report_count"] for r in reports}
    questions = Question.objects.filter(id__in=counts.keys())
    output = []
    for q in questions:
        mapped = _map_question_full(q)
        mapped["reportCount"] = counts.get(str(q.id), 0)
        output.append(mapped)
    return output


def delete_question(question_id: str) -> None:
    Question.objects.filter(id=question_id).delete()


def count_all() -> int:
    return Question.objects.count()


def create_question(
    text: str,
    correct_answer: str,
    category: str | None,
    difficulty: str | None,
) -> None:
    Question.objects.create(
        text=text,
        correct_answer=correct_answer,
        category=category,
        difficulty=difficulty,
    )


def bulk_create_questions(items: list[dict[str, Any]]) -> int:
    objs = [
        Question(
            text=item["text"],
            correct_answer=item["correctAnswer"],
            category=item.get("category"),
            difficulty=item.get("difficulty"),
        )
        for item in items
    ]
    created = Question.objects.bulk_create(objs)
    return len(created)


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
    Question.objects.filter(id=question_id).update(**update)


def list_all_questions(
    *,
    search: str | None,
    category: str | None,
    difficulty: str | None,
    limit: int,
    offset: int,
) -> dict[str, Any]:
    qs = Question.objects.all()
    if category:
        qs = qs.filter(category=category)
    if difficulty:
        qs = qs.filter(difficulty=difficulty)
    if search:
        qs = qs.filter(text__icontains=search)

    total = qs.count()
    items = list(qs.order_by("text")[offset : offset + limit])
    return {
        "items": [_map_question_full(q) for q in items],
        "total": total,
    }


def get_category_stats() -> list[dict[str, Any]]:
    from django.db.models import Count

    stats = (
        Question.objects.exclude(category__isnull=True)
        .exclude(category="")
        .values("category")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    return [{"category": s["category"], "count": s["count"]} for s in stats]


def rename_category(old_name: str, new_name: str) -> int:
    updated = Question.objects.filter(category=old_name).update(category=new_name)
    return updated
