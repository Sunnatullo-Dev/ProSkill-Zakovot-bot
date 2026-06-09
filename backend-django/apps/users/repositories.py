from __future__ import annotations

from typing import Any

from django.db.models import Count, F

from apps.core.exceptions import AppError

from .models import User


REFERRAL_LEADERBOARD_LIMIT = 20
# Legacy placeholder values that were used before the Telegram name fix.
# On login we clear these so the real Telegram name shows automatically.
_LEGACY_DISPLAY_NAMES: frozenset[str] = frozenset({"Zakovatchi", "guest", "Zakovatchi guest"})


def _map_user(user: User) -> dict[str, Any]:
    return {
        "id": str(user.pk),
        "telegramId": user.telegram_id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "username": user.username,
        "displayName": user.display_name,
        "score": user.score,
        "language": user.language,
    }


def upsert_user(
    telegram_id: int,
    first_name: str | None,
    last_name: str | None,
    username: str | None,
) -> dict[str, Any]:
    user, _ = User.objects.update_or_create(
        telegram_id=telegram_id,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
            "username": username,
        },
    )
    # Clear stale placeholder displayNames set during early testing
    if user.display_name in _LEGACY_DISPLAY_NAMES:
        User.objects.filter(telegram_id=telegram_id).update(display_name=None)
        user.display_name = None
    return _map_user(user)


def find_by_telegram_id(telegram_id: int) -> dict[str, Any] | None:
    user = User.objects.filter(telegram_id=telegram_id).first()
    return _map_user(user) if user else None


def update_display_name(telegram_id: int, display_name: str | None) -> dict[str, Any]:
    updated = User.objects.filter(telegram_id=telegram_id).update(
        display_name=display_name
    )
    if not updated:
        raise AppError(404, "Foydalanuvchi topilmadi")
    user = User.objects.get(telegram_id=telegram_id)
    return _map_user(user)


def update_language(telegram_id: int, language: str) -> None:
    """User.language maydonini yangilaydi. Auth bo'lmasa hech narsa qilmaydi."""
    User.objects.filter(telegram_id=telegram_id).update(language=language)


def get_language(telegram_id: int) -> str | None:
    """Saqlangan til kodini qaytaradi, foydalanuvchi yo'q bo'lsa None."""
    user = User.objects.filter(telegram_id=telegram_id).only("language").first()
    return user.language if user else None


def get_unlocked_achievements(telegram_id: int) -> list[str]:
    user = User.objects.filter(telegram_id=telegram_id).first()
    if not user:
        return []
    raw = user.unlocked_achievements
    if isinstance(raw, list):
        return [str(item) for item in raw]
    return []


def set_unlocked_achievements(telegram_id: int, ids: list[str]) -> None:
    User.objects.filter(telegram_id=telegram_id).update(unlocked_achievements=ids)


def get_streak(telegram_id: int) -> int:
    user = User.objects.filter(telegram_id=telegram_id).only("current_streak").first()
    return user.current_streak if user else 0


def set_streak(telegram_id: int, streak: int) -> None:
    User.objects.filter(telegram_id=telegram_id).update(current_streak=max(0, streak))


def add_score(telegram_id: int, amount: int) -> dict[str, Any]:
    """Foydalanuvchi balliga musbat miqdor qo'shadi.

    amount <= 0 bo'lsa — xato ko'taradi (manfiy ball berish ta'qiqlangan;
    buning uchun `deduct_score_if_sufficient` ishlatilsin).
    Score hech qachon manfiy bo'lmaydi: `GREATEST(score + amount, 0)` ekvivalent.
    """
    if amount <= 0:
        raise ValueError(f"add_score: amount musbat bo'lishi kerak, berildi: {amount}")
    updated = User.objects.filter(telegram_id=telegram_id).update(
        score=F("score") + amount
    )
    if not updated:
        raise AppError(404, "User not found")
    user = User.objects.get(telegram_id=telegram_id)
    return _map_user(user)


def deduct_score_if_sufficient(telegram_id: int, amount: int) -> bool:
    """Atomik: score >= amount bo'lsa kamaytiradi va True qaytaradi.

    score < amount bo'lsa — hech narsa o'zgartirmaydi va False qaytaradi.
    Bu shuni anglatadiki, score hech qachon manfiy bo'lmaydi.
    """
    if amount <= 0:
        raise ValueError(f"deduct_score_if_sufficient: amount musbat bo'lishi kerak, berildi: {amount}")
    updated = User.objects.filter(
        telegram_id=telegram_id, score__gte=amount
    ).update(score=F("score") - amount)
    return bool(updated)


def get_top_users(limit: int = 10) -> list[dict[str, Any]]:
    users = User.objects.order_by("-score", "created_at")[:limit]
    return [_map_user(u) for u in users]


def get_user_rank(telegram_id: int) -> int:
    user = User.objects.filter(telegram_id=telegram_id).first()
    if not user:
        return 0
    rank = User.objects.filter(score__gt=user.score).count() + 1
    return rank


def set_referrer(user_telegram_id: int, referrer_telegram_id: int) -> None:
    if referrer_telegram_id == user_telegram_id:
        return
    if not User.objects.filter(telegram_id=referrer_telegram_id).exists():
        return
    User.objects.filter(telegram_id=user_telegram_id, referred_by__isnull=True).update(
        referred_by=referrer_telegram_id
    )


def get_referral_count(telegram_id: int) -> int:
    return User.objects.filter(referred_by=telegram_id).count()


def get_referral_leaderboard() -> list[dict[str, Any]]:
    top = (
        User.objects.filter(referred_by__isnull=False)
        .values("referred_by")
        .annotate(count=Count("id"))
        .order_by("-count")[:REFERRAL_LEADERBOARD_LIMIT]
    )
    if not top:
        return []
    ids = [row["referred_by"] for row in top]
    user_map = {
        u.telegram_id: u for u in User.objects.filter(telegram_id__in=ids)
    }
    output = []
    for row in top:
        tid = row["referred_by"]
        if tid in user_map:
            output.append({"user": _map_user(user_map[tid]), "count": row["count"]})
    return output


def count_all() -> int:
    return User.objects.count()


def list_users(page: int = 1, limit: int = 20, search: str | None = None) -> dict:
    from django.db.models import Q
    qs = User.objects.order_by("-created_at")
    if search:
        q = Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(username__icontains=search)
        if search.strip().lstrip("-").isdigit():
            q |= Q(telegram_id=int(search.strip()))
        qs = qs.filter(q)
    total = qs.count()
    offset = (page - 1) * limit
    return {"items": [_map_user(u) for u in qs[offset : offset + limit]], "total": total}


_EXPORT_HARD_LIMIT = 10_000


def get_all_users_for_export() -> dict:
    total = User.objects.count()
    qs = User.objects.order_by("-score")[:_EXPORT_HARD_LIMIT]
    items = [_map_user(u) for u in qs.iterator(chunk_size=500)]
    return {"items": items, "total": total, "truncated": total > _EXPORT_HARD_LIMIT}


def get_all_telegram_ids() -> list[int]:
    return list(
        User.objects.values_list("telegram_id", flat=True).iterator(chunk_size=1000)
    )


def list_admins() -> list[dict]:
    from .models import BotAdmin
    return [
        {
            "telegramId": a.telegram_id,
            "firstName": a.first_name,
            "username": a.username,
            "addedBy": a.added_by,
            "addedAt": a.added_at.isoformat(),
            "note": a.note,
        }
        for a in BotAdmin.objects.order_by("added_at")
    ]


def add_admin(telegram_id: int, added_by: int, first_name: str | None = None, username: str | None = None, note: str = "") -> dict:
    from .models import BotAdmin
    from apps.core.exceptions import AppError
    obj, created = BotAdmin.objects.get_or_create(
        telegram_id=telegram_id,
        defaults={"added_by": added_by, "first_name": first_name, "username": username, "note": note},
    )
    if not created:
        raise AppError(409, "Bu foydalanuvchi allaqachon admin")
    return {"telegramId": obj.telegram_id, "firstName": obj.first_name, "username": obj.username}


def remove_admin(telegram_id: int) -> bool:
    from .models import BotAdmin
    deleted, _ = BotAdmin.objects.filter(telegram_id=telegram_id).delete()
    return deleted > 0
