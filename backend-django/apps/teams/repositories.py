"""Teams jadval repositoriy qatlami — eski `team.repository.ts` ning Python varianti."""
from __future__ import annotations

import random
import string
from typing import Any, Literal

from apps.core.exceptions import AppError
from apps.core.supabase_client import table


CODE_CHARS = string.ascii_uppercase + string.digits
CODE_LENGTH = 6
CODE_GENERATION_ATTEMPTS = 8
TEAM_COLUMNS = "id, name, code, owner_id, max_members, status, created_at"

TeamStatus = Literal["open", "in_battle", "closed"]


def _map_team(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "code": row.get("code"),
        "ownerId": row.get("owner_id"),
        "maxMembers": row.get("max_members"),
        "status": row.get("status"),
        "createdAt": row.get("created_at"),
    }


def _generate_code() -> str:
    return "".join(random.choice(CODE_CHARS) for _ in range(CODE_LENGTH))


def find_membership(telegram_id: int) -> dict[str, Any] | None:
    result = (
        table("team_members")
        .select("id, team_id, telegram_id, joined_at")
        .eq("telegram_id", telegram_id)
        .maybe_single()
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Jamoa a'zoligini tekshirib bo'lmadi")

    return result["data"]


def create_team(name: str, owner_id: int) -> dict[str, Any]:
    # Yagona kod yaratishga urinish — Supabase'da UNIQUE constraint bor.
    code = ""
    for _ in range(CODE_GENERATION_ATTEMPTS):
        candidate = _generate_code()
        lookup = (
            table("teams")
            .select("id")
            .eq("code", candidate)
            .maybe_single()
            .execute()
        )
        if lookup["error"]:
            raise AppError(500, "Kod tekshirib bo'lmadi")
        if not lookup["data"]:
            code = candidate
            break

    if not code:
        raise AppError(500, "Yagona kod yaratib bo'lmadi, qaytadan urinib ko'ring")

    team_insert = (
        table("teams")
        .insert({"name": name, "code": code, "owner_id": owner_id})
        .select(TEAM_COLUMNS)
        .single()
        .execute()
    )

    if team_insert["error"] or not team_insert["data"]:
        raise AppError(500, "Jamoa yaratish muvaffaqiyatsiz")

    team_row = team_insert["data"]
    member_insert = (
        table("team_members")
        .insert({"team_id": team_row["id"], "telegram_id": owner_id})
        .execute()
    )

    if member_insert["error"]:
        # Rollback: yangi yaratilgan jamoani o'chiramiz.
        table("teams").delete().eq("id", team_row["id"]).execute()
        raise AppError(500, "Egasini a'zo sifatida qo'shib bo'lmadi")

    return _map_team(team_row)


def get_team_with_members(team_id: str) -> dict[str, Any]:
    team_result = (
        table("teams")
        .select(TEAM_COLUMNS)
        .eq("id", team_id)
        .maybe_single()
        .execute()
    )

    if team_result["error"]:
        raise AppError(500, "Jamoani olib bo'lmadi")
    if not team_result["data"]:
        raise AppError(404, "Jamoa topilmadi")

    members = _fetch_members(team_id)
    team = _map_team(team_result["data"])
    team["members"] = members
    return team


def _fetch_members(team_id: str) -> list[dict[str, Any]]:
    members_result = (
        table("team_members")
        .select("telegram_id, joined_at")
        .eq("team_id", team_id)
        .order("joined_at", ascending=True)
        .execute()
    )

    if members_result["error"]:
        raise AppError(500, "A'zolarni olib bo'lmadi")

    member_rows = members_result["data"] or []
    if not member_rows:
        return []

    ids = [row["telegram_id"] for row in member_rows]
    users_result = (
        table("users")
        .select("telegram_id, first_name, username")
        .in_("telegram_id", ids)
        .execute()
    )

    if users_result["error"]:
        raise AppError(500, "Foydalanuvchilarni olib bo'lmadi")

    user_map = {row["telegram_id"]: row for row in users_result["data"] or []}
    return [
        {
            "telegramId": row["telegram_id"],
            "joinedAt": row["joined_at"],
            "firstName": (user_map.get(row["telegram_id"]) or {}).get("first_name"),
            "username": (user_map.get(row["telegram_id"]) or {}).get("username"),
        }
        for row in member_rows
    ]


def get_team_by_telegram_id(telegram_id: int) -> dict[str, Any] | None:
    membership = find_membership(telegram_id)
    if not membership:
        return None
    return get_team_with_members(membership["team_id"])


def join_team_by_code(code: str, telegram_id: int) -> dict[str, Any]:
    normalized = code.strip().upper()
    lookup = (
        table("teams")
        .select(TEAM_COLUMNS)
        .eq("code", normalized)
        .maybe_single()
        .execute()
    )

    if lookup["error"]:
        raise AppError(500, "Jamoani qidirib bo'lmadi")
    if not lookup["data"]:
        raise AppError(404, "Bu kod bilan jamoa topilmadi")

    team_row = lookup["data"]
    if team_row.get("status") != "open":
        raise AppError(409, "Bu jamoa hozir o'yinda yoki yopiq")

    count_result = (
        table("team_members")
        .select("id")
        .eq("team_id", team_row["id"])
        .with_count("exact")
        .execute()
    )

    if count_result["error"]:
        raise AppError(500, "A'zolar sonini olib bo'lmadi")

    if (count_result["count"] or 0) >= (team_row.get("max_members") or 0):
        raise AppError(409, "Jamoa to'lib qolgan")

    insert_result = (
        table("team_members")
        .insert({"team_id": team_row["id"], "telegram_id": telegram_id})
        .execute()
    )

    if insert_result["error"]:
        error_payload = insert_result["error"]
        if isinstance(error_payload, dict) and str(error_payload.get("code")) == "23505":
            raise AppError(409, "Siz allaqachon boshqa jamoadasiz")
        raise AppError(500, "A'zo qo'shib bo'lmadi")

    return get_team_with_members(team_row["id"])


def get_team_by_id(team_id: str) -> dict[str, Any] | None:
    result = (
        table("teams")
        .select(TEAM_COLUMNS)
        .eq("id", team_id)
        .maybe_single()
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Jamoani olib bo'lmadi")

    return _map_team(result["data"]) if result["data"] else None


def find_team_by_code(code: str) -> dict[str, Any] | None:
    normalized = code.strip().upper()
    result = (
        table("teams")
        .select(TEAM_COLUMNS)
        .eq("code", normalized)
        .maybe_single()
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Jamoani qidirib bo'lmadi")

    return _map_team(result["data"]) if result["data"] else None


def update_status(team_id: str, status: TeamStatus) -> None:
    result = (
        table("teams")
        .update({"status": status})
        .eq("id", team_id)
        .execute()
    )

    if result["error"]:
        raise AppError(500, "Jamoa holatini yangilab bo'lmadi")


def leave_team(telegram_id: int) -> None:
    membership = find_membership(telegram_id)
    if not membership:
        return

    team_id = membership["team_id"]

    delete_result = (
        table("team_members")
        .delete()
        .eq("id", membership["id"])
        .execute()
    )

    if delete_result["error"]:
        raise AppError(500, "Jamoadan chiqib bo'lmadi")

    remaining_result = (
        table("team_members")
        .select("telegram_id")
        .eq("team_id", team_id)
        .order("joined_at", ascending=True)
        .limit(1)
        .execute()
    )

    if remaining_result["error"]:
        raise AppError(500, "Qolgan a'zolarni tekshirib bo'lmadi")

    remaining = remaining_result["data"] or []
    if not remaining:
        # Hech kim qolmagan — jamoani o'chiramiz.
        table("teams").delete().eq("id", team_id).execute()
        return

    team_result = (
        table("teams")
        .select("owner_id")
        .eq("id", team_id)
        .maybe_single()
        .execute()
    )

    if team_result["error"]:
        raise AppError(500, "Jamoani tekshirib bo'lmadi")

    team_row = team_result["data"]
    if team_row and team_row.get("owner_id") == telegram_id:
        # Egasi chiqib ketgan — eng eski a'zoga ega bo'lib qoladi.
        table("teams").update({"owner_id": remaining[0]["telegram_id"]}).eq("id", team_id).execute()
