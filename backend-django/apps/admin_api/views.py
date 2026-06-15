"""Admin API — /api/admin/* — @require_admin himoyasi ostida."""
from __future__ import annotations

import logging
import re

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.battles.models import BattleChallenge
from apps.channels import repositories as channel_repo
from apps.core.decorators import require_admin
from apps.core.exceptions import AppError
from apps.core.models import AppSettings
from apps.game_results import repositories as game_result_repo
from apps.game_results.repositories import count_all as count_game_results
from apps.questions import repositories as question_repo
from apps.teams.models import Team
from apps.users import repositories as user_repo
from apps.users.repositories import count_all as count_users


logger = logging.getLogger(__name__)


MAX_PAGE_LIMIT = 50
DEFAULT_PAGE_LIMIT = 20
BULK_LIMIT = 500
UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _require_super_admin(request) -> None:
    telegram_id = getattr(request.current_user, "telegram_id", 0)
    if telegram_id not in getattr(settings, "ADMIN_TELEGRAM_IDS", []):
        raise AppError(403, "Faqat super-admin bu amalni bajarishi mumkin")


def _safe_count(callable_) -> int:
    try:
        return callable_()
    except Exception:
        logger.exception("admin stat count failed")
        return 0


def _safe_count_list(callable_):
    try:
        return callable_()
    except Exception:
        logger.exception("admin stat list failed")
        return []


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


def _coerce_wrong_answers(raw, *, field: str = "wrongAnswers") -> list[str]:
    """A/B/C/D rejimi uchun 3 ta noto'g'ri variantni tekshirib qaytaradi.

    - None yoki [] → bo'sh list (erkin javob rejimi)
    - String list bo'lishi shart, har biri 1..200 belgi
    - Aniq 3 ta bo'lishi shart (test 4 variantli)
    - Takrorlanmaslik kerak
    - To'g'ri javob bilan teng bo'lmasligi tekshiriladi caller tomonida
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise AppError(400, f"{field} ro'yxat bo'lishi kerak")
    if len(raw) == 0:
        return []
    if len(raw) != 3:
        raise AppError(400, f"{field}: aniq 3 ta noto'g'ri variant kerak")
    cleaned: list[str] = []
    seen: set[str] = set()
    for index, item in enumerate(raw):
        if not isinstance(item, str):
            raise AppError(400, f"{field}[{index}] matn bo'lishi kerak")
        text = item.strip()
        if not text:
            raise AppError(400, f"{field}[{index}] bo'sh bo'lmasin")
        if len(text) > 200:
            raise AppError(400, f"{field}[{index}] 200 belgidan oshmasin")
        key = text.casefold()
        if key in seen:
            raise AppError(400, f"{field}: variantlar takrorlanmasin")
        seen.add(key)
        cleaned.append(text)
    return cleaned


def _parse_time_limit_seconds(raw) -> int | None:
    """timeLimitSeconds maydonini validatsiya qiladi.

    None → None (standart 15s ishlatiladi)
    Raqam → 5-120 oralig'ida bo'lishi kerak
    """
    if raw is None:
        return None
    try:
        val = int(raw)
    except (TypeError, ValueError):
        raise AppError(400, "timeLimitSeconds raqam bo'lishi kerak")
    if not (5 <= val <= 120):
        raise AppError(400, "timeLimitSeconds 5-120 soniya oralig'ida bo'lishi kerak")
    return val


# ── App Settings ──────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@require_admin
def app_settings(request):
    """Global ilova sozlamalarini olish yoki yangilash."""
    if request.method == "GET":
        settings = AppSettings.get()
        return Response(settings.to_dict())

    # PATCH — qisman yangilash
    body = request.data if isinstance(request.data, dict) else {}
    settings, _ = AppSettings.objects.get_or_create(id=1)

    bool_fields = {
        "battleChatEnabled": "battle_chat_enabled",
        "battleShowCorrectOnTimeout": "battle_show_correct_on_timeout",
        "ttsEnabled": "tts_enabled",
        "ttsDefaultMuted": "tts_default_muted",
        "difficultyEasyEnabled": "difficulty_easy_enabled",
        "difficultyMediumEnabled": "difficulty_medium_enabled",
        "difficultyHardEnabled": "difficulty_hard_enabled",
        "svoyakCoordinatorEnabled": "svoyak_coordinator_enabled",
    }

    updated_fields = []
    for api_key, model_field in bool_fields.items():
        if api_key in body:
            val = body[api_key]
            if not isinstance(val, bool):
                raise AppError(400, f"{api_key} boolean bo'lishi kerak")
            setattr(settings, model_field, val)
            updated_fields.append(model_field)

    if "battleChatPollIntervalMs" in body:
        try:
            interval = int(body["battleChatPollIntervalMs"])
        except (TypeError, ValueError):
            raise AppError(400, "battleChatPollIntervalMs raqam bo'lishi kerak")
        if not (1000 <= interval <= 30000):
            raise AppError(400, "battleChatPollIntervalMs 1000-30000 oralig'ida bo'lishi kerak")
        settings.battle_chat_poll_interval_ms = interval
        updated_fields.append("battle_chat_poll_interval_ms")

    if "svoyakTimePerQuestion" in body:
        try:
            secs = int(body["svoyakTimePerQuestion"])
        except (TypeError, ValueError):
            raise AppError(400, "svoyakTimePerQuestion raqam bo'lishi kerak")
        if not (5 <= secs <= 120):
            raise AppError(400, "svoyakTimePerQuestion 5-120 soniya oralig'ida bo'lishi kerak")
        settings.svoyak_time_per_question = secs
        updated_fields.append("svoyak_time_per_question")

    if updated_fields:
        settings.save(update_fields=updated_fields)
        AppSettings.invalidate_cache()
        logger.info(
            "app_settings_updated",
            extra={"event": "app_settings_updated", "fields": updated_fields,
                   "by": getattr(request.current_user, "telegram_id", 0)},
        )

    return Response(settings.to_dict())


# ── Stats ──────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@require_admin
def get_stats(request):
    users_count = _safe_count(count_users)
    questions_count = _safe_count(question_repo.count_all)
    categories_stats = _safe_count_list(question_repo.get_category_stats)
    games_count = _safe_count(count_game_results)
    battles_count = _safe_count(BattleChallenge.objects.count)
    teams_count = _safe_count(Team.objects.count)

    return Response({
        "users": users_count,
        "questions": questions_count,
        "submissions": {"pending": 0, "approved": 0, "rejected": 0},
        "categories": categories_stats,
        "games": games_count,
        "battles": battles_count,
        "teams": teams_count,
    })


# ── Questions ─────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
def questions_collection(request):
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
        wrong_answers = _coerce_wrong_answers(body.get("wrongAnswers"))
        # To'g'ri javobning o'zi noto'g'ri variantlar ichida bo'lmasin —
        # aks holda baholash chalkash bo'ladi.
        if wrong_answers and correct_answer.casefold() in {w.casefold() for w in wrong_answers}:
            raise AppError(400, "To'g'ri javob noto'g'ri variantlar orasida bo'lmasin")
        time_limit_seconds = _parse_time_limit_seconds(body.get("timeLimitSeconds"))
        question_repo.create_question(
            text, correct_answer, category, difficulty,
            wrong_answers=wrong_answers,
            time_limit_seconds=time_limit_seconds,
        )
        return Response({"ok": True}, status=201)

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
    result = question_repo.list_all_questions(search=search, category=category_filter, difficulty=difficulty_raw, limit=limit, offset=offset)
    return Response({"items": result["items"], "total": result["total"], "page": page, "limit": limit})


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
        correct = _coerce_text(item.get("correctAnswer"), min_len=1, field=f"#{index + 1} javob")
        wrong = _coerce_wrong_answers(item.get("wrongAnswers"), field=f"#{index + 1} wrongAnswers")
        if wrong and correct.casefold() in {w.casefold() for w in wrong}:
            raise AppError(400, f"#{index + 1}: To'g'ri javob noto'g'ri variantlar orasida")
        cleaned.append({
            "text": _coerce_text(item.get("text"), min_len=3, field=f"#{index + 1} savol matni"),
            "correctAnswer": correct,
            "category": (item.get("category") or "").strip() or None if isinstance(item.get("category"), str) else item.get("category"),
            "difficulty": _coerce_difficulty(item.get("difficulty")),
            "wrongAnswers": wrong,
        })
    inserted = question_repo.bulk_create_questions(cleaned)
    return Response({"ok": True, "inserted": inserted}, status=201)


@api_view(["PATCH", "DELETE"])
@require_admin
def question_detail(request, question_id: str):
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
    wrong_answers: list[str] | None = None
    if "wrongAnswers" in body:
        wrong_answers = _coerce_wrong_answers(body.get("wrongAnswers"))
        # PATCH'da wrong_answers'ni yangilash uchun mavjud correct_answer'ni
        # ham olishimiz kerak (validatsiya uchun).
        existing_correct = correct_answer
        if existing_correct is None:
            existing_q = question_repo.get_question_by_id(question_id)
            if not existing_q:
                raise AppError(404, "Savol topilmadi")
            existing_correct = existing_q["correctAnswer"]
        if wrong_answers and existing_correct.casefold() in {w.casefold() for w in wrong_answers}:
            raise AppError(400, "To'g'ri javob noto'g'ri variantlar orasida bo'lmasin")
    time_limit_seconds = None
    unset_time_limit = False
    if "timeLimitSeconds" in body:
        raw_tl = body.get("timeLimitSeconds")
        if raw_tl is None:
            unset_time_limit = True
        else:
            time_limit_seconds = _parse_time_limit_seconds(raw_tl)
    question_repo.update_question(
        question_id,
        text=text,
        correct_answer=correct_answer,
        category=category,
        difficulty=difficulty,
        wrong_answers=wrong_answers,
        unset_category=unset_category,
        unset_difficulty=unset_difficulty,
        time_limit_seconds=time_limit_seconds,
        unset_time_limit=unset_time_limit,
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


# ── Users ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@require_admin
def list_users(request):
    params = request.query_params
    search = (params.get("search") or "").strip() or None
    try:
        page = max(1, int(params.get("page") or 1))
    except ValueError:
        raise AppError(400, "page noto'g'ri")
    try:
        limit = max(1, min(MAX_PAGE_LIMIT, int(params.get("limit") or DEFAULT_PAGE_LIMIT)))
    except ValueError:
        raise AppError(400, "limit noto'g'ri")
    result = user_repo.list_users(page=page, limit=limit, search=search)
    return Response(result)


@api_view(["GET"])
@require_admin
def user_profile(request, telegram_id: int):
    """Bitta foydalanuvchining to'liq profili — faqat admin uchun.

    GET /api/admin/users/<telegram_id>/profile
    """
    user = user_repo.find_by_telegram_id(telegram_id)
    if not user:
        raise AppError(404, "Foydalanuvchi topilmadi")

    stats = game_result_repo.get_stats(telegram_id)
    history = game_result_repo.get_history(telegram_id, limit=10)
    referral_count = user_repo.get_referral_count(telegram_id)

    return Response({
        "user": user,
        "stats": stats,
        "referralCount": referral_count,
        "recentGames": history,
    })


@api_view(["GET"])
@require_admin
def export_users(request):
    return Response(user_repo.get_all_users_for_export())


@api_view(["GET"])
@require_admin
def all_telegram_ids(request):
    ids = user_repo.get_all_telegram_ids()
    return Response({"ids": ids, "total": len(ids)})


# ── Admins ────────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
def admins_collection(request):
    if request.method == "POST":
        _require_super_admin(request)
        body = request.data if isinstance(request.data, dict) else {}
        try:
            telegram_id = int(body.get("telegramId") or 0)
        except (TypeError, ValueError):
            raise AppError(400, "telegramId noto'g'ri")
        if not telegram_id:
            raise AppError(400, "telegramId kerak")
        added_by = request.current_user.telegram_id
        first_name = (body.get("firstName") or "").strip() or None
        username = (body.get("username") or "").strip() or None
        note = (body.get("note") or "").strip()
        result = user_repo.add_admin(telegram_id, added_by=added_by, first_name=first_name, username=username, note=note)
        # Admin qo'shish — yuqori darajadagi audit event, WARNING bilan loglaymiz.
        logger.warning(
            "admin_added",
            extra={"event": "admin_added", "target": telegram_id, "by": added_by, "note": note[:80]},
        )
        return Response({"ok": True, "admin": result}, status=201)
    return Response({"items": user_repo.list_admins()})


@api_view(["DELETE"])
@require_admin
def admin_detail(request, telegram_id: int):
    _require_super_admin(request)
    removed = user_repo.remove_admin(telegram_id)
    if not removed:
        raise AppError(404, "Admin topilmadi")
    by = getattr(request.current_user, "telegram_id", 0)
    logger.warning(
        "admin_removed",
        extra={"event": "admin_removed", "target": telegram_id, "by": by},
    )
    return Response({"ok": True})


# ── Required Channels ─────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@require_admin
def channels_collection(request):
    """Majburiy kanallar ro'yxati (GET) yoki yangi kanal qo'shish (POST).

    POST body::

        {
            "channelId": "-1001234567890",  // yoki "@username"
            "channelUsername": "mychannel", // ixtiyoriy, @ siz
            "channelTitle": "Kanal nomi",
            "channelUrl": "https://t.me/mychannel"
        }
    """
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}

        # Faqat username va nom kerak — qolganini avtomatik hisoblaymiz
        raw_username = (body.get("channelUsername") or "").strip().lstrip("@")
        if not raw_username:
            raise AppError(400, "Kanal username kerak (masalan: mychannel yoki @mychannel)")
        # Faqat harf, raqam va _ bo'lsin
        import re as _re
        if not _re.match(r'^[A-Za-z0-9_]{4,}$', raw_username):
            raise AppError(400, "Username noto'g'ri (faqat harf, raqam, _ — kamida 4 belgi)")

        channel_title = (body.get("channelTitle") or "").strip()
        if not channel_title:
            raise AppError(400, "Kanal nomi kerak")

        # Telegram getChat API orqali kanal mavjudligini tekshiramiz
        exists, info = channel_repo.verify_channel_exists(raw_username)
        if exists is False:
            raise AppError(
                400,
                f"@{raw_username} nomli kanal topilmadi. "
                "Iltimos to'g'ri kanal username'ini yozing va botni "
                "kanalga admin sifatida qo'shing."
            )

        # Kanal topilsa — Telegram'dan numeric ID va rasmiy ma'lumotlarni olamiz
        if exists is True:
            channel_id = info["numericId"]          # masalan: -1001234567890
            channel_url = info["url"]
            # Admin kiritgan nomni saqlaymiz (Telegram sarlavhasini emas)
            # chunki lokalizatsiyalangan nom kerak bo'lishi mumkin
        else:
            # Token yo'q yoki tarmoq xatosi — @username bilan davom etamiz
            channel_id = f"@{raw_username}"
            channel_url = f"https://t.me/{raw_username}"

        user = request.current_user
        result = channel_repo.add_channel(
            channel_id=channel_id,
            channel_username=raw_username,
            channel_title=channel_title,
            channel_url=channel_url,
            added_by_telegram_id=user.telegram_id,
            added_by_name=getattr(user, "first_name", "") or str(user.telegram_id),
        )
        return Response({"ok": True, "channel": result}, status=201)

    # GET — barcha kanallar (aktiv + o'chirilgan)
    return Response({"channels": channel_repo.list_all_channels()})


@api_view(["DELETE", "POST"])
@require_admin
def channel_detail(request, channel_pk: int):
    """Kanalni o'chirish (DELETE) yoki qayta faollashtirish (POST).

    DELETE → soft delete (is_active=False)
    POST   → reactivate (is_active=True)
    """
    if request.method == "DELETE":
        ok = channel_repo.deactivate_channel(channel_pk)
        if not ok:
            raise AppError(404, "Kanal topilmadi")
        logger.info(
            "required_channel_deactivated",
            extra={"event": "channel_deactivated", "pk": channel_pk,
                   "by": getattr(request.current_user, "telegram_id", 0)},
        )
        return Response({"ok": True})

    # POST → activate
    ok = channel_repo.activate_channel(channel_pk)
    if not ok:
        raise AppError(404, "Kanal topilmadi")
    return Response({"ok": True})
