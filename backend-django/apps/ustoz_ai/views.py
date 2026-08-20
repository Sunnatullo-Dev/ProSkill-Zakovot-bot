"""Ustoz AI public va admin REST endpointlari."""
from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_auth, require_admin
from apps.core.exceptions import AppError

from .models import Subject, Lesson, UstozQuestion


# ─── Public endpoints ────────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def list_subjects(request):
    """Aktiv fanlar ro'yxati — har birida nechta dars borligi bilan."""
    subjects = Subject.objects.filter(is_active=True).order_by("order", "name")
    data = []
    for s in subjects:
        lesson_count = s.lessons.filter(is_active=True).count()
        data.append({
            "id": s.id,
            "name": s.name,
            "iconEmoji": s.icon_emoji,
            "description": s.description,
            "lessonCount": lesson_count,
        })
    return Response({"items": data})


@api_view(["GET"])
@require_auth
def list_lessons(request, subject_id):
    """Fan ichidagi aktiv darslar ro'yxati."""
    try:
        subject = Subject.objects.get(id=subject_id, is_active=True)
    except Subject.DoesNotExist:
        raise AppError(404, "Fan topilmadi")

    lessons = subject.lessons.filter(is_active=True).order_by("order", "name")
    data = []
    for l in lessons:
        q_count = l.questions.filter(is_active=True).count()
        data.append({
            "id": l.id,
            "name": l.name,
            "description": l.description,
            "questionCount": q_count,
        })
    return Response({
        "subject": {"id": subject.id, "name": subject.name, "iconEmoji": subject.icon_emoji},
        "items": data,
    })


@api_view(["GET"])
@require_auth
def list_questions(request, lesson_id):
    """Dars savollari — to'g'ri javob FAQAT tekshirishda, frontend'ga yuborilmaydi."""
    try:
        lesson = Lesson.objects.select_related("subject").get(id=lesson_id, is_active=True)
    except Lesson.DoesNotExist:
        raise AppError(404, "Dars topilmadi")

    questions = lesson.questions.filter(is_active=True).order_by("order", "id")
    data = []
    for q in questions:
        data.append({
            "id": q.id,
            "text": q.text,
            "optionA": q.option_a,
            "optionB": q.option_b,
            "optionC": q.option_c,
            "optionD": q.option_d,
            # correctOption frontend'ga yuborilmaydi — server tekshiradi
        })
    return Response({
        "lesson": {
            "id": lesson.id,
            "name": lesson.name,
            "subject": {"id": lesson.subject.id, "name": lesson.subject.name},
        },
        "items": data,
    })


@api_view(["POST"])
@require_auth
def check_answer(request, question_id):
    """Foydalanuvchi javobini tekshirish va to'g'ri javobni qaytarish."""
    try:
        question = UstozQuestion.objects.select_related("lesson__subject").get(
            id=question_id, is_active=True
        )
    except UstozQuestion.DoesNotExist:
        raise AppError(404, "Savol topilmadi")

    body = request.data if isinstance(request.data, dict) else {}
    selected = (body.get("selected") or "").strip().lower()

    if selected not in ("a", "b", "c", "d"):
        raise AppError(400, "selected a/b/c/d dan biri bo'lishi kerak")

    is_correct = selected == question.correct_option
    return Response({
        "correct": is_correct,
        "correctOption": question.correct_option,
        "explanation": question.explanation,
    })


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
def admin_subjects(request):
    if request.method == "GET":
        subjects = Subject.objects.all().order_by("order", "name")
        data = [{
            "id": s.id, "name": s.name, "iconEmoji": s.icon_emoji,
            "description": s.description, "order": s.order,
            "isActive": s.is_active,
            "lessonCount": s.lessons.count(),
        } for s in subjects]
        return Response({"items": data})

    body = request.data if isinstance(request.data, dict) else {}
    name = (body.get("name") or "").strip()
    if not name:
        raise AppError(400, "name talab qilinadi")

    subject = Subject.objects.create(
        name=name,
        icon_emoji=(body.get("iconEmoji") or "📚").strip(),
        description=(body.get("description") or "").strip(),
        order=int(body.get("order") or 0),
        created_by=getattr(getattr(request, "current_user", None), "telegram_id", None),
    )
    return Response({"id": subject.id, "name": subject.name}, status=201)


@api_view(["PATCH", "DELETE"])
@require_admin
def admin_subject_detail(request, pk):
    try:
        subject = Subject.objects.get(id=pk)
    except Subject.DoesNotExist:
        raise AppError(404, "Fan topilmadi")

    if request.method == "DELETE":
        subject.delete()
        return Response({"ok": True})

    body = request.data if isinstance(request.data, dict) else {}
    if "name" in body:
        subject.name = (body["name"] or "").strip() or subject.name
    if "iconEmoji" in body:
        subject.icon_emoji = (body["iconEmoji"] or "📚").strip()
    if "description" in body:
        subject.description = (body["description"] or "").strip()
    if "order" in body:
        subject.order = int(body["order"] or 0)
    if "isActive" in body:
        subject.is_active = bool(body["isActive"])
    subject.save()
    return Response({"ok": True})


@api_view(["GET", "POST"])
@require_admin
def admin_lessons(request):
    if request.method == "GET":
        subject_id = request.query_params.get("subjectId")
        qs = Lesson.objects.select_related("subject").order_by("subject__order", "order", "name")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        data = [{
            "id": l.id,
            "subjectId": l.subject_id,
            "subjectName": l.subject.name,
            "name": l.name,
            "description": l.description,
            "order": l.order,
            "isActive": l.is_active,
            "questionCount": l.questions.count(),
        } for l in qs]
        return Response({"items": data})

    body = request.data if isinstance(request.data, dict) else {}
    subject_id = body.get("subjectId")
    name = (body.get("name") or "").strip()
    if not subject_id:
        raise AppError(400, "subjectId talab qilinadi")
    if not name:
        raise AppError(400, "name talab qilinadi")
    try:
        subject = Subject.objects.get(id=int(subject_id))
    except (Subject.DoesNotExist, ValueError):
        raise AppError(404, "Fan topilmadi")

    lesson = Lesson.objects.create(
        subject=subject,
        name=name,
        description=(body.get("description") or "").strip(),
        order=int(body.get("order") or 0),
        created_by=getattr(getattr(request, "current_user", None), "telegram_id", None),
    )
    return Response({"id": lesson.id, "name": lesson.name}, status=201)


@api_view(["PATCH", "DELETE"])
@require_admin
def admin_lesson_detail(request, pk):
    try:
        lesson = Lesson.objects.get(id=pk)
    except Lesson.DoesNotExist:
        raise AppError(404, "Dars topilmadi")

    if request.method == "DELETE":
        lesson.delete()
        return Response({"ok": True})

    body = request.data if isinstance(request.data, dict) else {}
    if "name" in body:
        lesson.name = (body["name"] or "").strip() or lesson.name
    if "description" in body:
        lesson.description = (body["description"] or "").strip()
    if "order" in body:
        lesson.order = int(body["order"] or 0)
    if "isActive" in body:
        lesson.is_active = bool(body["isActive"])
    lesson.save()
    return Response({"ok": True})


@api_view(["GET", "POST"])
@require_admin
def admin_questions(request):
    if request.method == "GET":
        lesson_id = request.query_params.get("lessonId")
        qs = UstozQuestion.objects.select_related("lesson__subject").order_by("lesson__order", "order", "id")
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        data = [{
            "id": q.id,
            "lessonId": q.lesson_id,
            "lessonName": q.lesson.name,
            "subjectName": q.lesson.subject.name,
            "text": q.text,
            "optionA": q.option_a,
            "optionB": q.option_b,
            "optionC": q.option_c,
            "optionD": q.option_d,
            "correctOption": q.correct_option,
            "explanation": q.explanation,
            "order": q.order,
            "isActive": q.is_active,
        } for q in qs]
        return Response({"items": data})

    body = request.data if isinstance(request.data, dict) else {}
    lesson_id = body.get("lessonId")
    text = (body.get("text") or "").strip()
    option_a = (body.get("optionA") or "").strip()
    option_b = (body.get("optionB") or "").strip()
    option_c = (body.get("optionC") or "").strip()
    option_d = (body.get("optionD") or "").strip()
    correct = (body.get("correctOption") or "").strip().lower()

    if not lesson_id:
        raise AppError(400, "lessonId talab qilinadi")
    if not text:
        raise AppError(400, "text talab qilinadi")
    if not all([option_a, option_b, option_c, option_d]):
        raise AppError(400, "optionA, optionB, optionC, optionD barchasi talab qilinadi")
    if correct not in ("a", "b", "c", "d"):
        raise AppError(400, "correctOption a/b/c/d dan biri bo'lishi kerak")

    try:
        lesson = Lesson.objects.get(id=int(lesson_id))
    except (Lesson.DoesNotExist, ValueError):
        raise AppError(404, "Dars topilmadi")

    question = UstozQuestion.objects.create(
        lesson=lesson,
        text=text,
        option_a=option_a,
        option_b=option_b,
        option_c=option_c,
        option_d=option_d,
        correct_option=correct,
        explanation=(body.get("explanation") or "").strip(),
        order=int(body.get("order") or 0),
        created_by=getattr(getattr(request, "current_user", None), "telegram_id", None),
    )
    return Response({"id": question.id}, status=201)


@api_view(["PATCH", "DELETE"])
@require_admin
def admin_question_detail(request, pk):
    try:
        question = UstozQuestion.objects.get(id=pk)
    except UstozQuestion.DoesNotExist:
        raise AppError(404, "Savol topilmadi")

    if request.method == "DELETE":
        question.delete()
        return Response({"ok": True})

    body = request.data if isinstance(request.data, dict) else {}
    fields = {
        "text": "text", "optionA": "option_a", "optionB": "option_b",
        "optionC": "option_c", "optionD": "option_d",
        "correctOption": "correct_option", "explanation": "explanation",
    }
    for json_key, model_field in fields.items():
        if json_key in body:
            val = (body[json_key] or "").strip()
            if json_key == "correctOption" and val not in ("a", "b", "c", "d"):
                raise AppError(400, "correctOption a/b/c/d dan biri bo'lishi kerak")
            setattr(question, model_field, val)
    if "order" in body:
        question.order = int(body["order"] or 0)
    if "isActive" in body:
        question.is_active = bool(body["isActive"])
    question.save()
    return Response({"ok": True})
