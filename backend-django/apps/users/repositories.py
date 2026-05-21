"""Users jadvalining repositoriy qatlami — Supabase REST orqali."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from apps.core.exceptions import AppError
from apps.core.supabase_client import table


USER_COLUMNS = (
    "id, telegram_id, first_name, last_name, username, display_name, score, "
    "unlocked_achievements"
)
REFERRAL_LEADERBOARD_LIMIT = 20


def _map_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "telegramId": row.get("telegram_id"),
        "firstName": row.get("first_name"),
        "lastName": row.get("last_name"),
        "username": row.get("username"),
        "displayName": row.get("display_name"),
        "score": row.get("score", 0),
    }


def upsert_user(telegram_id: int, first_name: str | None, last_name: str | None, username: str | None) -> dict[str, Any]:
    result = (
        table("users")
        .upsert(
            {
                "telegram_id": telegram_id,
                "first_name": first_name,
                "last_name": last_name,
                "username": username,
                "updated_at": datetime.now(tz=timezone.utc).isoformat(),
            },
            on_conflict="telegram_id",
        )
        .select(USER_COLUMNS)
        .single()
        .execute()
    )

    if result["error"] or not result["data"]:
        raise AppError(500, "User upsert failed")

    return _map_user(result["data"])


def find_by_telegram_id(telegram_id: int) -> dict[str, Any] | None:
    result = (
        table("users")
        .select(USER_COLUMNS)
        .eq("telegram_id", telegram_id)
        .maybe_single()
        .execute()
    )

    if result["error"]:
        raise AppError(500, "User lookup failed")

    return _map_user(result["data"]) if result["data"] else None


def update_display_name(telegram_id: int, display_name: str | None) -> dict[str, Any]:
    """Foydalanuvchining ko'rinish ismini yangilaydi. None = nullga tushiradi."""
    result = (
        table("users")
        .update({"display_name": display_name})
        .eq("telegram_id", telegram_id)
        .select(USER_COLUMNS)
        .single()
        .execute()
    )
    if result["error"] or not result["data"]:
        raise AppError(500, "Ismni yangilab bo'lmadi")
    return _map_user(result["data"])


def get_unlocked_achievements(telegram_id: int) -> list[str]:
    result = (
        table("users")
        .select("unlocked_achievements")
        .eq("telegram_id", telegram_id)
        .maybe_single()
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Yutuqlarni olib bo'lmadi")
    data = result["data"] or {}
    raw = data.get("unlocked_achievements")
    if isinstance(raw, list):
        return [str(item) for item in raw]
    return []


def set_unlocked_achievements(telegram_id: int, ids: list[str]) -> None:
    result = (
        table("users")
        .update({"unlocked_achievements": ids})
        .eq("telegram_id", telegram_id)
        .execute()
    )
    if result["error"]:
        raise AppError(500, "Yutuqlarni saqlab bo'lmadi")


def add_score(telegram_id: int, amount: int) -> dict[str, Any]:
    user = find_by_telegram_id(telegram_id)
    if not user:
        raise AppError(404, "User not found")

    new_score = (user["score"] or 0) + amount
    result = (
        table("users")
        .update(
            {
                "score": new_score,
                "updated_at": datetime.now(tz=timezone.utc).isoformat(),
            }
        )
        .eq("telegram_id", telegram_id)
        .select(USER_COLUMNS)
        .single()
        .execute()
    )

    if result["error"] or not result["data"]:
        raise AppError(500, "Score update failed")

    return _map_user(result["data"])


def get_top_users(limit: int = 10) -> list[dict[str, Any]]:
    result = (
        table("users")
        .select(USER_COLUMNS)
        .order("score", ascending=False)
        .order("created_at", ascending=True)
        .limit(limit)
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Top users lookup failed")

    return [_map_user(row) for row in result["data"] or []]


def get_user_rank(telegram_id: int) -> int:
    user = find_by_telegram_id(telegram_id)
    if not user:
        return 0

    result = (
        table("users")
        .select("id")
        .gt("score", user["score"] or 0)
        .with_count("exact")
        .execute()
    )

    if result["error"]:
        raise AppError(500, "User rank lookup failed")

    return (result["count"] or 0) + 1


def set_referrer(user_telegram_id: int, referrer_telegram_id: int) -> None:
    if referrer_telegram_id == user_telegram_id:
        return

    referrer = find_by_telegram_id(referrer_telegram_id)
    if not referrer:
        return

    result = (
        table("users")
        .update({"referred_by": referrer_telegram_id})
        .eq("telegram_id", user_telegram_id)
        .is_("referred_by", "null")
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Referrer update failed")


def get_referral_count(telegram_id: int) -> int:
    result = (
        table("users")
        .select("id")
        .eq("referred_by", telegram_id)
        .with_count("exact")
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Referral count failed")

    return result["count"] or 0


def get_referral_leaderboard() -> list[dict[str, Any]]:
    result = (
        table("users")
        .select("referred_by")
        .neq("referred_by", "null")
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Referral leaderboard failed")

    counts: dict[int, int] = {}
    for row in result["data"] or []:
        rid = row.get("referred_by")
        if rid is None:
            continue
        counts[int(rid)] = counts.get(int(rid), 0) + 1

    top = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:REFERRAL_LEADERBOARD_LIMIT]
    if not top:
        return []

    users_result = (
        table("users")
        .select(USER_COLUMNS)
        .in_("telegram_id", [tid for tid, _ in top])
        .execute()
    )

    if users_result["error"]:
        raise AppError(500, "Referral users lookup failed")

    user_map = {row.get("telegram_id"): _map_user(row) for row in users_result["data"] or []}
    output = []
    for tid, count in top:
        if tid in user_map:
            output.append({"user": user_map[tid], "count": count})
    return output


def count_all() -> int:
    result = table("users").select("id").with_count("exact").execute()
    if result["error"]:
        raise AppError(500, "Users count failed")
    return result["count"] or 0
