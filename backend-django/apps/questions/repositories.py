from __future__ import annotations

from typing import Any

from apps.core.exceptions import AppError

from .models import Question, QuestionReport


def _map_question_public(q: Question) -> dict[str, Any]:
    # wrong_answers'ni faqat valid string list bo'lsa qaytaramiz —
    # JSON ichida buzilgan ma'lumot bo'lsa frontend xato qilmasin.
    #
    # A/B/C/D rejimi: backend `options` array tartibsiz qaytaradi va to'g'ri
    # javob shu ichida bo'ladi. Foydalanuvchi tanlasa, backend tomonida ham
    # taqqoslash bilan tekshiriladi. To'g'ri javob frontend'ga alohida
    # `correctAnswer` sifatida YUBORILMAYDI — chunki sahifa manbasidan
    # ko'rib qo'yib bo'ladi.
    import secrets

    raw_wrong = q.wrong_answers if isinstance(q.wrong_answers, list) else []
    wrong = [str(item) for item in raw_wrong if isinstance(item, str) and item.strip()]

    options: list[str] = []
    if len(wrong) == 3 and q.correct_answer:
        # crypto-shuffle: predict qilib bo'lmasin (qaysi variant doim "to'g'ri" deb
        # bashorat qilishni qiyinlashtirish — odam o'yini uchun nisbatan ortiqcha,
        # lekin "har doim A" kabi pattern'larni oldini olamiz).
        pool = [q.correct_answer, *wrong]
        # Fisher-Yates secrets bilan
        for i in range(len(pool) - 1, 0, -1):
            j = secrets.randbelow(i + 1)
            pool[i], pool[j] = pool[j], pool[i]
        options = pool

    return {
        "id": str(q.id),
        "text": q.text,
        "category": q.category,
        "difficulty": q.difficulty,
        # Eski `wrongAnswers` qaytarmaymiz — chunki to'g'ri javob alohida
        # body'da yo'q, lekin `wrongAnswers` ko'rinsa kim noto'g'ri ekanini
        # bilib qoladi. Buning o'rniga `options` (aralashtirilgan, 4 ta).
        "options": options,
        # Savol uchun vaqt limiti — frontend taymerini moslashtiradi.
        # NULL = standart (15s).
        "timeLimitSeconds": q.time_limit_seconds,
    }


def _map_question_full(q: Question) -> dict[str, Any]:
    """Admin view — barcha maydonlar (to'g'ri javob ham, wrongAnswers ham).

    Bu faqat admin endpoint'lari uchun. Public endpoint'lar
    `_map_question_public` ishlatadi (correctAnswer va wrongAnswers
    yashirin — faqat shuffled `options` qaytariladi).
    """
    base = _map_question_public(q)
    base["correctAnswer"] = q.correct_answer
    # Admin tahrirlash uchun original wrong_answers — shuffle qilinmagan,
    # 3 ta string ro'yxati. Bo'sh bo'lsa savol erkin matn rejimida.
    raw_wrong = q.wrong_answers if isinstance(q.wrong_answers, list) else []
    base["wrongAnswers"] = [
        str(item) for item in raw_wrong if isinstance(item, str) and item.strip()
    ]
    base["timeLimitSeconds"] = q.time_limit_seconds  # NULL = standart (15s)
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
    *,
    wrong_answers: list[str] | None = None,
    time_limit_seconds: int | None = None,
) -> None:
    Question.objects.create(
        text=text,
        correct_answer=correct_answer,
        category=category,
        difficulty=difficulty,
        wrong_answers=wrong_answers or [],
        time_limit_seconds=time_limit_seconds,
    )


def bulk_create_questions(items: list[dict[str, Any]]) -> int:
    objs = [
        Question(
            text=item["text"],
            correct_answer=item["correctAnswer"],
            category=item.get("category"),
            difficulty=item.get("difficulty"),
            wrong_answers=item.get("wrongAnswers") or [],
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
    wrong_answers: list[str] | None = None,
    unset_category: bool = False,
    unset_difficulty: bool = False,
    time_limit_seconds: int | None = None,
    unset_time_limit: bool = False,
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
    if wrong_answers is not None:
        # `wrong_answers=[]` qabul qilinadi — bu "A/B/C/D rejimini o'chir"
        # va savolni erkin matn rejimiga qaytar degani.
        update["wrong_answers"] = wrong_answers
    if unset_time_limit:
        update["time_limit_seconds"] = None
    elif time_limit_seconds is not None:
        update["time_limit_seconds"] = time_limit_seconds

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


def get_questions_by_ids(ids: list[str]) -> list[dict[str, Any]]:
    """Berilgan ID tartibida savollarni qaytaradi (public format, options aralashtirilgan)."""
    questions = {str(q.id): q for q in Question.objects.filter(id__in=ids)}
    return [_map_question_public(questions[qid]) for qid in ids if qid in questions]
