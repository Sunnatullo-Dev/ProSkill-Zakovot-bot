from __future__ import annotations

import secrets
import string
from typing import Any, Literal

from django.db import IntegrityError, transaction

from apps.core.exceptions import AppError
from apps.users.models import User

from .models import Team, TeamChatMessage, TeamMember


CODE_CHARS = string.ascii_uppercase + string.digits
CODE_LENGTH = 6
CODE_GENERATION_ATTEMPTS = 8

TeamStatus = Literal["open", "in_battle", "closed"]


def _map_team(team: Team) -> dict[str, Any]:
    return {
        "id": str(team.id),
        "name": team.name,
        "code": team.code,
        "ownerId": team.owner_id,
        "maxMembers": team.max_members,
        "status": team.status,
        "createdAt": team.created_at.isoformat() if team.created_at else None,
    }


def _generate_code() -> str:
    # Crypto-grade RNG — Python random predictable; jamoa kodlari odamlar
    # qo'lida (URL'larda baham ko'rinadi), shuning uchun guess'lab bo'lmasin.
    return "".join(secrets.choice(CODE_CHARS) for _ in range(CODE_LENGTH))


def find_membership(telegram_id: int) -> dict[str, Any] | None:
    member = TeamMember.objects.filter(telegram_id=telegram_id).first()
    if not member:
        return None
    return {
        "id": member.pk,
        "team_id": str(member.team_id),
        "telegram_id": member.telegram_id,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
    }


def create_team(name: str, owner_id: int) -> dict[str, Any]:
    code = ""
    for _ in range(CODE_GENERATION_ATTEMPTS):
        candidate = _generate_code()
        if not Team.objects.filter(code=candidate).exists():
            code = candidate
            break

    if not code:
        raise AppError(500, "Yagona kod yaratib bo'lmadi, qaytadan urinib ko'ring")

    # Team va birinchi a'zo — bitta atomic blok ichida. Jarayon o'rtada
    # to'xtab qolsa orphan team qolmaydi, transaction butun rollback bo'ladi.
    try:
        with transaction.atomic():
            team = Team.objects.create(name=name, code=code, owner_id=owner_id)
            TeamMember.objects.create(team=team, telegram_id=owner_id)
    except IntegrityError:
        raise AppError(500, "Jamoa yaratish muvaffaqiyatsiz")

    return _map_team(team)


def get_team_with_members(team_id: str) -> dict[str, Any]:
    team = Team.objects.filter(id=team_id).first()
    if not team:
        raise AppError(404, "Jamoa topilmadi")
    result = _map_team(team)
    result["members"] = _fetch_members(team)
    return result


def _fetch_members(team: Team) -> list[dict[str, Any]]:
    member_rows = list(
        TeamMember.objects.filter(team=team).order_by("joined_at")
    )
    if not member_rows:
        return []

    ids = [m.telegram_id for m in member_rows]
    user_map = {
        u.telegram_id: u
        for u in User.objects.filter(telegram_id__in=ids)
    }
    output = []
    for m in member_rows:
        u = user_map.get(m.telegram_id)
        output.append(
            {
                "telegramId": m.telegram_id,
                "joinedAt": m.joined_at.isoformat() if m.joined_at else None,
                "firstName": u.first_name if u else None,
                "username": u.username if u else None,
            }
        )
    return output


def get_team_by_telegram_id(telegram_id: int) -> dict[str, Any] | None:
    membership = find_membership(telegram_id)
    if not membership:
        return None
    return get_team_with_members(membership["team_id"])


def join_team_by_code(code: str, telegram_id: int) -> dict[str, Any]:
    """Jamoaga qo'shilish — TOCTOU race'siz.

    Avval kod orqali team'ni topamiz (lock'siz), keyin atomic blok ichida
    `select_for_update` bilan team qatorini bloklab member_count'ni tekshiramiz.
    Ikki bir vaqtda qo'shilish urinish bir-birini ko'radi, faqat birinchisi
    o'tadi (yoki to'lguncha qancha bo'lsa).
    """
    normalized = code.strip().upper()
    team_row = Team.objects.filter(code=normalized).only("id").first()
    if not team_row:
        raise AppError(404, "Bu kod bilan jamoa topilmadi")

    try:
        with transaction.atomic():
            # Endi team qatorini bloklaymiz — boshqa join shu bilan kutib turadi.
            team = Team.objects.select_for_update().get(id=team_row.id)
            if team.status != "open":
                raise AppError(409, "Bu jamoa hozir o'yinda yoki yopiq")
            member_count = TeamMember.objects.filter(team=team).count()
            if member_count >= team.max_members:
                raise AppError(409, "Jamoa to'lib qolgan")
            TeamMember.objects.create(team=team, telegram_id=telegram_id)
    except IntegrityError:
        raise AppError(409, "Siz allaqachon boshqa jamoadasiz")

    return get_team_with_members(str(team.id))


def get_team_by_id(team_id: str) -> dict[str, Any] | None:
    team = Team.objects.filter(id=team_id).first()
    return _map_team(team) if team else None


def find_team_by_code(code: str) -> dict[str, Any] | None:
    normalized = code.strip().upper()
    team = Team.objects.filter(code=normalized).first()
    return _map_team(team) if team else None


def update_status(team_id: str, status: TeamStatus) -> None:
    Team.objects.filter(id=team_id).update(status=status)


def update_name(team_id: str, name: str) -> dict[str, Any]:
    Team.objects.filter(id=team_id).update(name=name)
    return get_team_with_members(team_id)


def transfer_owner(team_id: str, new_owner_telegram_id: int) -> dict[str, Any]:
    """Jamoa egaligini boshqa a'zoga o'tkazadi — atomic + member tekshiruvi.

    Race: tekshiruvdan keyin yangi sardor jamoadan chiqib ketmasligi uchun
    team va member qatorlarini lock qilamiz.
    """
    with transaction.atomic():
        team = Team.objects.select_for_update().filter(id=team_id).first()
        if not team:
            raise AppError(404, "Jamoa topilmadi")
        # Yangi sardor a'zo bo'lib qolganini lock ostida qayta tasdiqlaymiz.
        if not TeamMember.objects.select_for_update().filter(
            team_id=team_id, telegram_id=new_owner_telegram_id
        ).exists():
            raise AppError(400, "Yangi sardor jamoaning a'zosi emas")
        team.owner_id = new_owner_telegram_id
        team.save(update_fields=["owner_id"])
    return get_team_with_members(team_id)


def is_team_member(team_id: str, telegram_id: int) -> bool:
    """Foydalanuvchi shu jamoa a'zosimi tekshiradi."""
    return TeamMember.objects.filter(team_id=team_id, telegram_id=telegram_id).exists()


# ---------------- Chat ----------------


def post_chat_message(team_id: str, telegram_id: int, text: str) -> dict[str, Any]:
    """Yangi xabar saqlaydi va to'liq ma'lumotini qaytaradi."""
    msg = TeamChatMessage.objects.create(
        team_id=team_id, telegram_id=telegram_id, text=text
    )
    return _map_message(msg)


def list_chat_messages(team_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """Eng so'nggi `limit` ta xabarni eski → yangi tartibda qaytaradi."""
    msgs = list(
        TeamChatMessage.objects.filter(team_id=team_id)
        .order_by("-created_at")[:limit]
    )
    msgs.reverse()
    return [_map_message(m) for m in msgs]


def _map_message(msg: "TeamChatMessage") -> dict[str, Any]:
    return {
        "id": str(msg.id),
        "telegramId": msg.telegram_id,
        "text": msg.text,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
    }


def leave_team(telegram_id: int) -> None:
    """Jamoadan chiqish — atomic.

    Race senariylari:
      - Ikki a'zo bir vaqtda chiqsa, ikkalasi ham team.delete() ga yetolmasligi
        kerak (yagona member qoladi).
      - Sardor chiqsa, yangi sardor jamoadan chiqib ketmasdan tayinlansin.
    """
    with transaction.atomic():
        member = (
            TeamMember.objects.select_for_update()
            .filter(telegram_id=telegram_id)
            .first()
        )
        if not member:
            return

        team = Team.objects.select_for_update().filter(id=member.team_id).first()
        if not team:
            member.delete()
            return

        member.delete()

        remaining = (
            TeamMember.objects.select_for_update()
            .filter(team=team)
            .order_by("joined_at")
            .first()
        )
        if not remaining:
            team.delete()
            return

        if team.owner_id == telegram_id:
            team.owner_id = remaining.telegram_id
            team.save(update_fields=["owner_id"])
