"""Online O'yin Xonasi — REST endpoint'lari.

Endpoint'lar ikki guruhga bo'linadi:
  - Admin endpoint'lari: `require_admin` dekorator (global admin) YOKI
    xona admini tekshiruvi (repositories darajasida). Ikki qatlam:
    1. Global admin bo'lmasa ham xona yaratgan kishi "xona admini".
    2. Boshqaruv amallari (push, close, grade, finish) faqat o'sha xona admini.
  - Ishtirokchi endpoint'lari: `require_auth` — xonaga qo'shilgan bo'lishi shart.

Barcha javob shakllari kamelCase formatida (frontend bilan moslashish uchun).
"""
from __future__ import annotations

from django.http import HttpResponse, HttpResponseRedirect

from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.decorators import require_admin, require_auth
from apps.core.exceptions import AppError
from apps.premium.limits import check_and_consume

from . import repositories


# ─── Admin endpoint'lari ──────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_auth
def admin_rooms(request):
    """Xonalar ro'yxati (GET) yoki yangi xona yaratish (POST).

    GET  /api/gamerooms/admin/rooms
         Auth: require_auth — faqat o'z xonalari qaytariladi
         Response: [ { code, name, status, isOwner, participantCount, ... } ]

    POST /api/gamerooms/admin/rooms
         Auth: require_admin (global admin bo'lishi shart)
         Body: { name, joinPassword?, extraAdminIds? }
         Response: { code, name, status, adminTelegramId, ... }
    """
    from apps.core.telegram_auth import is_admin as _is_admin

    user = request.current_user

    if request.method == "GET":
        result = repositories.list_admin_rooms(admin_telegram_id=user.telegram_id)
        return Response(result)

    # POST — yangi xona yaratish (global admin kerak)
    if not _is_admin(user.telegram_id):
        raise AppError(403, "Admin huquqi kerak")
    check_and_consume(user, "gameroom")

    body = request.data if isinstance(request.data, dict) else {}
    name = (body.get("name") or "").strip()
    join_password = (body.get("joinPassword") or "").strip()

    raw_extra = body.get("extraAdminIds")
    extra_admins: list[dict] = []
    if isinstance(raw_extra, list):
        for item in raw_extra:
            if isinstance(item, dict):
                try:
                    extra_admins.append({"telegram_id": int(item["telegram_id"]), "name": str(item.get("name", ""))})
                except (KeyError, TypeError, ValueError):
                    raise AppError(400, "extraAdminIds formati noto'g'ri")
            elif isinstance(item, int):
                extra_admins.append({"telegram_id": item, "name": ""})

    result = repositories.create_room(
        admin_telegram_id=user.telegram_id,
        name=name,
        join_password=join_password,
        extra_admin_ids=extra_admins,
    )
    return Response(result, status=201)


# Keep the old name as an alias so any direct references still work.
admin_create_room = admin_rooms


@api_view(["POST"])
@require_auth
def admin_start_room(request, code: str):
    """O'yinni boshlash (waiting → active).

    POST /api/gamerooms/admin/rooms/<code>/start
    Auth: xona admini
    """
    user = request.current_user
    result = repositories.start_room(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


@api_view(["POST"])
@require_auth
def admin_finish_room(request, code: str):
    """O'yinni yakunlash.

    POST /api/gamerooms/admin/rooms/<code>/finish
    Auth: xona admini
    """
    user = request.current_user
    result = repositories.finish_room(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


@api_view(["POST"])
@require_auth
def admin_push_question(request, code: str):
    """Yangi savol push qilish va darhol active qilish.

    POST /api/gamerooms/admin/rooms/<code>/questions
    Body: {
        questionType: "text"|"audio"|"image",
        body: str,
        mediaRef?: str,
        caption?: str,
        correctAnswer?: str,
        timeLimitSeconds?: int,  # 30/60/90/120/180
        pointValue?: int,        # 1/2/3
        isBonus?: bool,
        isQuick?: bool,
    }
    Auth: xona admini
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    try:
        time_limit = int(body.get("timeLimitSeconds", 120))
    except (TypeError, ValueError):
        raise AppError(400, "timeLimitSeconds raqam bo'lishi kerak")

    try:
        point_value = int(body.get("pointValue", 1))
    except (TypeError, ValueError):
        raise AppError(400, "pointValue raqam bo'lishi kerak")

    result = repositories.push_question(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_type=body.get("questionType", "text"),
        body=body.get("body", ""),
        media_ref=body.get("mediaRef", ""),
        caption=body.get("caption", ""),
        correct_answer=body.get("correctAnswer", ""),
        time_limit_seconds=time_limit,
        point_value=point_value,
        is_bonus=bool(body.get("isBonus", False)),
        is_quick=bool(body.get("isQuick", False)),
    )
    return Response(result, status=201)


@api_view(["POST"])
@require_auth
def admin_close_question(request, code: str, question_id: int):
    """Aktiv savolni yopish.

    POST /api/gamerooms/admin/rooms/<code>/questions/<id>/close
    Auth: xona admini
    """
    user = request.current_user
    result = repositories.close_question(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
    )
    return Response(result)


@api_view(["PATCH"])
@require_auth
def admin_set_correct_answer(request, code: str, question_id: int):
    """To'g'ri javobni belgilash yoki o'zgartirish.

    PATCH /api/gamerooms/admin/rooms/<code>/questions/<id>/correct-answer
    Body: { correctAnswer: str }
    Auth: xona admini
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    correct_answer = (body.get("correctAnswer") or "").strip()

    result = repositories.set_correct_answer(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
        correct_answer=correct_answer,
    )
    return Response(result)


@api_view(["POST"])
@require_auth
def admin_auto_grade(request, code: str, question_id: int):
    """Savolni avtomatik baholash (exact_match + Gemini).

    POST /api/gamerooms/admin/rooms/<code>/questions/<id>/auto-grade
    Auth: xona admini
    """
    user = request.current_user
    result = repositories.auto_grade_question(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
    )
    return Response(result)


@api_view(["PATCH"])
@require_auth
def admin_manual_grade(request, code: str, submission_id: int):
    """Bitta submission'ni qo'lda baholash.

    PATCH /api/gamerooms/admin/rooms/<code>/submissions/<id>/grade
    Body: { isCorrect: bool }
    Auth: xona admini
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    is_correct_raw = body.get("isCorrect")
    if is_correct_raw is None:
        raise AppError(400, "isCorrect (true/false) yuborilishi kerak")
    is_correct = bool(is_correct_raw)

    result = repositories.manual_grade_submission(
        code=code,
        admin_telegram_id=user.telegram_id,
        submission_id=submission_id,
        is_correct=is_correct,
    )
    return Response(result)


@api_view(["GET"])
@require_auth
def admin_get_submissions(request, code: str, question_id: int):
    """Savolning barcha javoblarini ko'rish.

    GET /api/gamerooms/admin/rooms/<code>/questions/<id>/submissions
    Auth: xona admini
    """
    user = request.current_user
    result = repositories.get_question_submissions(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
    )
    return Response(result)


@api_view(["GET"])
@require_auth
def admin_get_grouped_submissions(request, code: str, question_id: int):
    """Savolning javoblarini guruhlangan holda ko'rish.

    GET /api/gamerooms/admin/rooms/<code>/questions/<id>/submissions/grouped
    Auth: xona admini
    Response: { questionId, totalSubmissions, totalUngraded, groups: [...] }
    """
    user = request.current_user
    result = repositories.get_grouped_submissions(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
    )
    return Response(result)


@api_view(["POST"])
@require_auth
def admin_bulk_grade(request, code: str, question_id: int):
    """Bir normalized javob guruhini ommaviy baholash.

    POST /api/gamerooms/admin/rooms/<code>/questions/<id>/bulk-grade
    Body: { normalizedKey: str, isCorrect: bool }
    Auth: xona admini
    Response: { gradedCount, questionId, isCorrect }
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    normalized_key = body.get("normalizedKey")
    if normalized_key is None:
        raise AppError(400, "normalizedKey yuborilishi kerak")

    is_correct_raw = body.get("isCorrect")
    if is_correct_raw is None:
        raise AppError(400, "isCorrect (true/false) yuborilishi kerak")
    is_correct = bool(is_correct_raw)

    result = repositories.bulk_grade_group(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
        normalized_key=str(normalized_key),
        is_correct=is_correct,
    )
    return Response(result)


@api_view(["POST"])
@require_auth
def admin_grade_rest_wrong(request, code: str, question_id: int):
    """Hali baholanmagan barcha javoblarni noto'g'ri deb belgilash.

    POST /api/gamerooms/admin/rooms/<code>/questions/<id>/grade-rest-wrong
    Auth: xona admini
    Response: { gradedCount, questionId }
    """
    user = request.current_user
    result = repositories.grade_rest_wrong(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
    )
    return Response(result)


@api_view(["GET"])
@require_auth
def admin_get_stats(request, code: str):
    """Xona statistikasi.

    GET /api/gamerooms/admin/rooms/<code>/stats
    Auth: xona admini
    """
    user = request.current_user
    result = repositories.get_room_stats(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


@api_view(["GET"])
@require_auth
def admin_get_results(request, code: str):
    """Xona natijalarini eksport qilish uchun raw data.

    GET /api/gamerooms/admin/rooms/<code>/results
    Auth: xona admini
    Response: { questions: [...], participants: [{rank, displayName, answers: [...]}] }
    """
    user = request.current_user
    result = repositories.get_room_results(code=code, admin_telegram_id=user.telegram_id)
    return Response(result)


# ─── Ishtirokchi endpoint'lari ────────────────────────────────────────────────

@api_view(["POST"])
@require_auth
def join_room(request, code: str):
    """Xonaga qo'shilish.

    POST /api/gamerooms/rooms/<code>/join
    Body: { displayName: str, joinPassword?: str }
    Auth: require_auth
    Response: room state
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}
    display_name = (body.get("displayName") or "").strip()
    join_password = (body.get("joinPassword") or "").strip()

    result = repositories.join_room(
        code=code,
        telegram_id=user.telegram_id,
        display_name=display_name,
        join_password=join_password,
    )
    return Response(result)


@api_view(["GET"])
@require_auth
def get_state(request, code: str):
    """Xona holatini polling orqali olish.

    GET /api/gamerooms/rooms/<code>/state
    Auth: require_auth
    Response: room state (aktiv savol, leaderboard, ...)
    """
    user = request.current_user
    is_admin_view = request.query_params.get("adminView") == "1"
    result = repositories.get_room_state(
        code,
        viewer_telegram_id=user.telegram_id,
        is_admin_view=is_admin_view,
    )
    return Response(result)


@api_view(["POST"])
@require_auth
def submit_answer(request, code: str):
    """Savol uchun javob yuborish yoki tahrirlash (upsert).

    POST /api/gamerooms/rooms/<code>/answer
    Body: { questionId: int, answer: str }
    Auth: require_auth
    Response: { submissionId, questionId, answerText, submittedAt, updatedAt, graded }
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    try:
        question_id = int(body.get("questionId"))
    except (TypeError, ValueError):
        raise AppError(400, "questionId raqam bo'lishi kerak")

    answer_text = body.get("answer") if isinstance(body.get("answer"), str) else ""

    result = repositories.submit_answer(
        code=code,
        telegram_id=user.telegram_id,
        question_id=question_id,
        answer_text=answer_text,
    )
    return Response(result)


@api_view(["GET"])
@require_auth
def get_leaderboard(request, code: str):
    """Joriy reyting.

    GET /api/gamerooms/rooms/<code>/leaderboard
    Auth: require_auth
    Response: { leaderboard: [...], winners: [...] (faqat finished) }
    """
    user = request.current_user
    result = repositories.get_leaderboard(code, viewer_telegram_id=user.telegram_id)
    return Response(result)


# ─── 1. Excel eksport ────────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def admin_get_results_xlsx(request, code: str):
    """Xona natijalarini .xlsx formatida eksport qilish.

    GET /api/gamerooms/admin/rooms/<code>/results.xlsx
    Auth: xona admini
    Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    """
    user = request.current_user
    buf, filename = repositories.export_room_results_xlsx(
        code=code,
        admin_telegram_id=user.telegram_id,
    )
    response = HttpResponse(
        buf.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# ─── 3. Media proxy ──────────────────────────────────────────────────────────

@api_view(["GET"])
@require_auth
def proxy_question_media(request, code: str, question_id: int):
    """Savol media faylini Telegram orqali proxylash.

    GET /api/gamerooms/rooms/<code>/questions/<id>/media
    Auth: require_auth (faqat xona a'zolari yoki admini)
    Response: fayl bytes + to'g'ri Content-Type
    """
    user = request.current_user
    try:
        content, content_type = repositories.resolve_question_media(
            code=code,
            question_id=question_id,
            viewer_telegram_id=user.telegram_id,
        )
    except AppError as e:
        # 302 — allaqachon http URL, redirect qilamiz
        if e.status_code == 302:
            return HttpResponseRedirect(e.message)
        raise
    response = HttpResponse(content, content_type=content_type)
    response["Cache-Control"] = "private, max-age=3600"
    return response


# ─── 4. Savollarni savol bankiga saqlash ────────────────────────────────────

@api_view(["POST"])
@require_auth
def admin_save_to_bank(request, code: str):
    """Xonaning matn savollarini umumiy savol bankiga saqlash.

    POST /api/gamerooms/admin/rooms/<code>/save-to-bank
    Body (ixtiyoriy): { category?: str, difficulty?: "easy"|"medium"|"hard" }
    Auth: xona admini
    Response: { savedCount, skippedCount, alreadySavedCount, totalTextQuestions }
    """
    user = request.current_user
    body = request.data if isinstance(request.data, dict) else {}

    category = (body.get("category") or "").strip() or None
    difficulty = (body.get("difficulty") or "").strip() or None
    if difficulty and difficulty not in ("easy", "medium", "hard"):
        raise AppError(400, "difficulty 'easy', 'medium' yoki 'hard' bo'lishi kerak")

    result = repositories.save_questions_to_bank(
        code=code,
        admin_telegram_id=user.telegram_id,
        category=category,
        difficulty=difficulty,
    )
    return Response(result)


# ─── 5. Savolni bekor qilish ─────────────────────────────────────────────────

@api_view(["POST"])
@require_auth
def admin_cancel_question(request, code: str, question_id: int):
    """Savolni bekor qilish — submissionlar va ball ta'siri o'chiriladi.

    POST /api/gamerooms/admin/rooms/<code>/questions/<id>/cancel
    Auth: xona admini
    Response: { cancelledQuestionId, deletedSubmissionsCount, pointsReversedFor }
    """
    user = request.current_user
    result = repositories.cancel_question(
        code=code,
        admin_telegram_id=user.telegram_id,
        question_id=question_id,
    )
    return Response(result)
