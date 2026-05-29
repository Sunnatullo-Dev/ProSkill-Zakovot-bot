"""Svoyak admin CRUD endpoint'lari.

Faqat adminlar uchun (require_admin). Kategoriyalar va savollar boshqaruvi
mini-app AdminPanel ichidan amalga oshiriladi.
"""
from __future__ import annotations

from django.db.models import Count
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin
from apps.core.exceptions import AppError

from .models import SvoyakCategory, SvoyakQuestion


# ─── Kategoriyalar ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
def admin_categories(request):
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        name = (body.get("name") or "").strip()
        if len(name) < 2:
            raise AppError(400, "Kategoriya nomi kamida 2 belgi")
        if len(name) > 100:
            raise AppError(400, "Kategoriya nomi 100 belgidan oshmasin")
        icon = (body.get("iconEmoji") or "").strip()
        language = (body.get("language") or "uz-latn").strip()
        order = body.get("order")
        try:
            order_val = int(order) if order is not None else SvoyakCategory.objects.count()
        except (TypeError, ValueError):
            raise AppError(400, "order noto'g'ri")

        cat = SvoyakCategory.objects.create(
            name=name,
            icon_emoji=icon,
            language=language,
            order=order_val,
            is_active=True,
        )
        return Response(_serialize_category(cat), status=201)

    # GET — barcha kategoriyalar (faqat aktiv emas — admin hammasini ko'radi)
    cats = (
        SvoyakCategory.objects.all()
        .annotate(question_count=Count("questions", distinct=True))
        .order_by("order", "name")
    )
    return Response({"items": [_serialize_category(c) for c in cats]})


@api_view(["PATCH", "DELETE"])
@require_admin
def admin_category_detail(request, category_id: int):
    try:
        cat = SvoyakCategory.objects.get(id=category_id)
    except SvoyakCategory.DoesNotExist:
        raise AppError(404, "Kategoriya topilmadi")

    if request.method == "DELETE":
        cat.delete()
        return Response({"ok": True})

    body = request.data if isinstance(request.data, dict) else {}
    if "name" in body:
        name = (body.get("name") or "").strip()
        if len(name) < 2:
            raise AppError(400, "Kategoriya nomi kamida 2 belgi")
        cat.name = name
    if "iconEmoji" in body:
        cat.icon_emoji = (body.get("iconEmoji") or "").strip()
    if "language" in body:
        cat.language = (body.get("language") or "uz-latn").strip()
    if "order" in body:
        try:
            cat.order = int(body.get("order"))
        except (TypeError, ValueError):
            raise AppError(400, "order raqam bo'lishi kerak")
    if "isActive" in body:
        cat.is_active = bool(body.get("isActive"))
    cat.save()

    return Response(_serialize_category(cat))


# ─── Savollar ───────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
def admin_questions(request):
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        cat_id = body.get("categoryId")
        try:
            cat_id = int(cat_id)
        except (TypeError, ValueError):
            raise AppError(400, "categoryId raqam bo'lishi kerak")
        try:
            cat = SvoyakCategory.objects.get(id=cat_id)
        except SvoyakCategory.DoesNotExist:
            raise AppError(404, "Kategoriya topilmadi")

        value_tier = body.get("valueTier")
        if value_tier not in (10, 20, 30, 40, 50):
            raise AppError(400, "valueTier 10/20/30/40/50 bo'lishi kerak")

        text = (body.get("text") or "").strip()
        if len(text) < 3:
            raise AppError(400, "Savol matni juda qisqa")
        correct = (body.get("correctAnswer") or "").strip()
        if not correct:
            raise AppError(400, "To'g'ri javob kerak")

        wrong_raw = body.get("wrongAnswers")
        wrong = _coerce_wrong_answers(wrong_raw, correct=correct)
        question_type = "abcd" if wrong else "text"

        q = SvoyakQuestion.objects.create(
            category=cat,
            value_tier=value_tier,
            text=text,
            correct_answer=correct,
            wrong_answers=wrong,
            question_type=question_type,
            is_active=True,
            created_by=getattr(request.current_user, "telegram_id", None),
        )
        return Response(_serialize_question(q), status=201)

    # GET
    params = request.query_params
    qs = SvoyakQuestion.objects.select_related("category").all()
    if params.get("categoryId"):
        try:
            qs = qs.filter(category_id=int(params.get("categoryId")))
        except ValueError:
            raise AppError(400, "categoryId noto'g'ri")
    if params.get("valueTier"):
        try:
            v = int(params.get("valueTier"))
            if v not in (10, 20, 30, 40, 50):
                raise AppError(400, "valueTier 10/20/30/40/50")
            qs = qs.filter(value_tier=v)
        except ValueError:
            raise AppError(400, "valueTier noto'g'ri")
    if params.get("search"):
        qs = qs.filter(text__icontains=params.get("search"))

    qs = qs.order_by("category__order", "value_tier", "id")
    total = qs.count()
    try:
        limit = max(1, min(200, int(params.get("limit", 50))))
        page = max(1, int(params.get("page", 1)))
    except ValueError:
        raise AppError(400, "page/limit noto'g'ri")
    offset = (page - 1) * limit
    items = list(qs[offset : offset + limit])
    return Response({
        "items": [_serialize_question(q) for q in items],
        "total": total,
        "page": page,
        "limit": limit,
    })


@api_view(["PATCH", "DELETE"])
@require_admin
def admin_question_detail(request, question_id: int):
    try:
        q = SvoyakQuestion.objects.select_related("category").get(id=question_id)
    except SvoyakQuestion.DoesNotExist:
        raise AppError(404, "Savol topilmadi")

    if request.method == "DELETE":
        q.delete()
        return Response({"ok": True})

    body = request.data if isinstance(request.data, dict) else {}
    if "categoryId" in body:
        try:
            q.category = SvoyakCategory.objects.get(id=int(body.get("categoryId")))
        except (TypeError, ValueError, SvoyakCategory.DoesNotExist):
            raise AppError(400, "Kategoriya noto'g'ri")
    if "valueTier" in body:
        v = body.get("valueTier")
        if v not in (10, 20, 30, 40, 50):
            raise AppError(400, "valueTier 10/20/30/40/50")
        q.value_tier = v
    if "text" in body:
        text = (body.get("text") or "").strip()
        if len(text) < 3:
            raise AppError(400, "Savol matni juda qisqa")
        q.text = text
    correct_changed = False
    if "correctAnswer" in body:
        correct = (body.get("correctAnswer") or "").strip()
        if not correct:
            raise AppError(400, "To'g'ri javob bo'sh bo'lmasin")
        q.correct_answer = correct
        correct_changed = True
    if "wrongAnswers" in body:
        q.wrong_answers = _coerce_wrong_answers(body.get("wrongAnswers"), correct=q.correct_answer)
        q.question_type = "abcd" if q.wrong_answers else "text"
    elif correct_changed and q.wrong_answers:
        # Correct o'zgardi-yu, wrong'lar mavjud — wrong'lar ichida correct bo'lib qolmasligi shart
        _coerce_wrong_answers(q.wrong_answers, correct=q.correct_answer)
    if "isActive" in body:
        q.is_active = bool(body.get("isActive"))

    q.save()
    return Response(_serialize_question(q))


# ─── Serializer + validator ─────────────────────────────────────────────────

def _serialize_category(c: SvoyakCategory) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "iconEmoji": c.icon_emoji,
        "language": c.language,
        "order": c.order,
        "isActive": c.is_active,
        "questionCount": getattr(c, "question_count", c.questions.count()),
    }


def _serialize_question(q: SvoyakQuestion) -> dict:
    return {
        "id": q.id,
        "categoryId": q.category_id,
        "categoryName": q.category.name,
        "categoryIcon": q.category.icon_emoji,
        "valueTier": q.value_tier,
        "text": q.text,
        "correctAnswer": q.correct_answer,
        "wrongAnswers": q.wrong_answers if isinstance(q.wrong_answers, list) else [],
        "questionType": q.question_type,
        "isActive": q.is_active,
    }


def _coerce_wrong_answers(raw, *, correct: str) -> list[str]:
    """3 ta unique noto'g'ri variant yoki bo'sh (text mode)."""
    if raw is None or raw == []:
        return []
    if not isinstance(raw, list):
        raise AppError(400, "wrongAnswers ro'yxat bo'lishi kerak")
    if len(raw) != 3:
        raise AppError(400, "Aniq 3 ta noto'g'ri variant kerak (yoki bo'sh qoldiring)")
    cleaned: list[str] = []
    seen = set()
    correct_norm = correct.strip().casefold()
    for i, item in enumerate(raw):
        if not isinstance(item, str):
            raise AppError(400, f"wrongAnswers[{i}] matn bo'lishi kerak")
        text = item.strip()
        if not text:
            raise AppError(400, f"wrongAnswers[{i}] bo'sh bo'lmasin")
        if len(text) > 200:
            raise AppError(400, f"wrongAnswers[{i}] 200 belgidan oshmasin")
        key = text.casefold()
        if key == correct_norm:
            raise AppError(400, "Noto'g'ri variant to'g'ri javob bilan bir xil bo'lmasin")
        if key in seen:
            raise AppError(400, "Variantlar takrorlanmasin")
        seen.add(key)
        cleaned.append(text)
    return cleaned
