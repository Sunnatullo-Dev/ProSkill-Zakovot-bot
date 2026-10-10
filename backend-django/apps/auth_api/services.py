"""Mobil ilova akkauntlari — ro'yxatdan o'tish, kirish, Telegram'ga bog'lash."""
from __future__ import annotations

import logging

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from apps.core.exceptions import AppError
from apps.users.models import (
    AUTH_PROVIDER_BOTH,
    AUTH_PROVIDER_PHONE,
    SYNTHETIC_TELEGRAM_ID_BASE,
    User,
)

from .credentials import mask_phone


logger = logging.getLogger(__name__)

_ID_ALLOCATION_ATTEMPTS = 8


def _next_synthetic_telegram_id() -> int:
    """Telegramsiz akkaunt uchun keyingi sintetik ID.

    `telegram_id` unique bo'lgani uchun kolliziya bo'lsa chaqiruvchi
    `IntegrityError` ni ushlab qayta uradi (jamoa kodlari bilan bir xil naqsh).
    """
    last = User.objects.filter(
        telegram_id__gte=SYNTHETIC_TELEGRAM_ID_BASE
    ).aggregate(m=Max("telegram_id"))["m"]
    return (last or SYNTHETIC_TELEGRAM_ID_BASE) + 1


def register_with_phone(
    *,
    phone: str,
    password: str,
    first_name: str,
    last_name: str | None = None,
    email: str | None = None,
    language: str = "uz-latn",
) -> User:
    """Yangi telefon+parol akkaunti yaratadi.

    Xatolar:
        409 — bu raqam allaqachon ro'yxatdan o'tgan
        500 — ID ajratib bo'lmadi (juda kam ehtimol)
    """
    existing = User.objects.filter(phone=phone).first()
    if existing:
        raise AppError(409, "Bu raqam allaqachon ro'yxatdan o'tgan. Kirishga urinib ko'ring.")

    if email:
        if User.objects.filter(email=email).exists():
            raise AppError(409, "Bu e-pochta allaqachon band")

    last_error: Exception | None = None
    for _ in range(_ID_ALLOCATION_ATTEMPTS):
        try:
            with transaction.atomic():
                user = User(
                    telegram_id=_next_synthetic_telegram_id(),
                    phone=phone,
                    email=email or None,
                    first_name=first_name,
                    last_name=last_name or None,
                    display_name=first_name,
                    auth_provider=AUTH_PROVIDER_PHONE,
                    language=language,
                )
                user.set_password(password)
                user.save()
            logger.info(
                "auth_register_phone",
                extra={
                    "event": "auth_register_phone",
                    "user_pk": user.pk,
                    "telegram_id": user.telegram_id,
                    "phone": mask_phone(phone),
                },
            )
            _notify_milestone_safe()
            return user
        except IntegrityError as exc:
            last_error = exc
            # Ikki parallel ro'yxatdan o'tish bir xil ID/raqamni oldi.
            # Raqam takrorlangan bo'lsa qayta urinishdan foyda yo'q.
            if User.objects.filter(phone=phone).exists():
                raise AppError(409, "Bu raqam allaqachon ro'yxatdan o'tgan")
            continue

    logger.error("auth_register_phone: ID ajratib bo'lmadi: %s", last_error)
    raise AppError(500, "Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring.")


_DUMMY_PASSWORD_HASH = (
    "pbkdf2_sha256$260000$dummy$dummyhashforuserenumerationtimingprotection"
)


def authenticate_with_phone(*, phone: str, password: str) -> User:
    """Telefon + parol bo'yicha kirish.

    Xavfsizlik:
        - Noma'lum raqam va noto'g'ri parol bir xil 401 xato beradi (user enumeration himoyasi).
        - Noma'lum raqam bo'lsa ham hasher ishlaydi (timing attack himoyasi).
    """
    from django.contrib.auth.hashers import check_password

    user = User.objects.filter(phone=phone).first()
    if not user:
        check_password(password, _DUMMY_PASSWORD_HASH)
        raise AppError(401, "Telefon raqam yoki parol noto'g'ri")

    if not user.has_usable_password() or not user.check_password(password):
        raise AppError(401, "Telefon raqam yoki parol noto'g'ri")

    mark_logged_in(user)
    return user


def mark_logged_in(user: User) -> None:
    User.objects.filter(pk=user.pk).update(last_login_at=timezone.now())


def change_password(*, user: User, current_password: str | None, new_password: str) -> None:
    """Parolni o'zgartiradi va barcha eski sessiyalarni bekor qiladi."""
    if user.has_usable_password():
        if not current_password or not user.check_password(current_password):
            raise AppError(400, "Joriy parol noto'g'ri")

    user.set_password(new_password)
    if user.auth_provider == "telegram":
        user.auth_provider = AUTH_PROVIDER_BOTH
    user.save(update_fields=["password_hash", "auth_provider", "updated_at"])
    user.bump_token_version()

    logger.info(
        "auth_password_changed",
        extra={"event": "auth_password_changed", "user_pk": user.pk},
    )


def _migrate_user_records(old_telegram_id: int, new_telegram_id: int) -> None:
    """Sintetik telegram_id ostida to'plangan barcha ma'lumotlarni haqiqiy Telegram ID'ga ko'chiradi."""
    from apps.game_results.models import GameResult
    from apps.daily.models import DailyAnswer, DailyChallengeEntry, UserDailyStreak
    from apps.teams.models import Team, TeamMember, TeamChatMessage
    from apps.battles.models import BattleAnswer
    from apps.svoyak.models import SvoyakPlayer, SvoyakRoom
    from apps.gamerooms.models import Participant, GameRoom
    from apps.premium.models import PremiumRequest
    from apps.author_questions.models import AuthorQuestion
    from apps.zakovat_table.models import ZtPlayer, ZtSpectator, ZtRoom

    # 1. Game results (telegram_id bo'yicha indekslangan, unique emas)
    GameResult.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)

    # 2. Daily streak (telegram_id noyob)
    if UserDailyStreak.objects.filter(telegram_id=new_telegram_id).exists():
        UserDailyStreak.objects.filter(telegram_id=old_telegram_id).delete()
    else:
        UserDailyStreak.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)

    # Daily challenge entries (unique_together = [["telegram_id", "date"]])
    for ent in DailyChallengeEntry.objects.filter(telegram_id=old_telegram_id):
        if DailyChallengeEntry.objects.filter(telegram_id=new_telegram_id, date=ent.date).exists():
            ent.delete()
        else:
            ent.telegram_id = new_telegram_id
            ent.save(update_fields=["telegram_id"])

    # Daily answer (unique_together = [["telegram_id", "date", "question_id"]])
    for ans in DailyAnswer.objects.filter(telegram_id=old_telegram_id):
        if DailyAnswer.objects.filter(telegram_id=new_telegram_id, date=ans.date, question_id=ans.question_id).exists():
            ans.delete()
        else:
            ans.telegram_id = new_telegram_id
            ans.save(update_fields=["telegram_id"])

    # 3. Teams (TeamMember'da telegram_id noyob, Team.owner_id, TeamChatMessage.telegram_id)
    if TeamMember.objects.filter(telegram_id=new_telegram_id).exists():
        TeamMember.objects.filter(telegram_id=old_telegram_id).delete()
    else:
        TeamMember.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)
    Team.objects.filter(owner_id=old_telegram_id).update(owner_id=new_telegram_id)
    TeamChatMessage.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)

    # 4. Battles (BattleAnswer: round, telegram_id, battle)
    BattleAnswer.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)

    # 5. Svoyak
    for sp in SvoyakPlayer.objects.filter(telegram_id=old_telegram_id):
        if SvoyakPlayer.objects.filter(room=sp.room, telegram_id=new_telegram_id).exists():
            sp.delete()
        else:
            sp.telegram_id = new_telegram_id
            sp.save(update_fields=["telegram_id"])
    SvoyakRoom.objects.filter(host_telegram_id=old_telegram_id).update(host_telegram_id=new_telegram_id)

    # 6. Gamerooms
    for gp in Participant.objects.filter(telegram_id=old_telegram_id):
        if Participant.objects.filter(room=gp.room, telegram_id=new_telegram_id).exists():
            gp.delete()
        else:
            gp.telegram_id = new_telegram_id
            gp.save(update_fields=["telegram_id"])
    GameRoom.objects.filter(admin_telegram_id=old_telegram_id).update(admin_telegram_id=new_telegram_id)

    # 7. Zakovat Table
    for zp in ZtPlayer.objects.filter(telegram_id=old_telegram_id):
        if ZtPlayer.objects.filter(room=zp.room, telegram_id=new_telegram_id).exists():
            zp.delete()
        else:
            zp.telegram_id = new_telegram_id
            zp.save(update_fields=["telegram_id"])

    for zs in ZtSpectator.objects.filter(telegram_id=old_telegram_id):
        if ZtSpectator.objects.filter(room=zs.room, telegram_id=new_telegram_id).exists():
            zs.delete()
        else:
            zs.telegram_id = new_telegram_id
            zs.save(update_fields=["telegram_id"])
    ZtRoom.objects.filter(admin_telegram_id=old_telegram_id).update(admin_telegram_id=new_telegram_id)

    # 8. Premium requests & author questions
    PremiumRequest.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)
    AuthorQuestion.objects.filter(telegram_id=old_telegram_id).update(telegram_id=new_telegram_id)


def create_telegram_link_token(user: User) -> dict:
    """Mobil ilovadan Telegram akkauntni bog'lash uchun bir martalik xavfsiz token yaratadi."""
    import hashlib
    import secrets
    from datetime import timedelta
    from django.conf import settings
    from apps.users.models import TelegramLinkToken

    if not user.is_app_account():
        raise AppError(409, "Bu akkaunt allaqachon Telegram'ga bog'langan")

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = timezone.now() + timedelta(minutes=15)

    # Eski ishlatilmagan tokenlarni tozalaymiz
    TelegramLinkToken.objects.filter(user=user, is_used=False).delete()

    TelegramLinkToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "ZakovatOyinBot") or "ZakovatOyinBot"
    link_url = f"https://t.me/{bot_username}?start=link_{raw_token}"

    logger.info(
        "auth_link_token_created",
        extra={"event": "auth_link_token_created", "user_pk": user.pk},
    )

    return {
        "token": raw_token,
        "botUsername": bot_username,
        "linkUrl": link_url,
        "expiresInSeconds": 900,
    }


def confirm_telegram_link_token(
    *,
    token: str,
    telegram_id: int,
    username: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
) -> User:
    """Telegram bot orqali bir martalik linking tokenni tasdiqlaydi va akkauntlarni birlashtiradi."""
    import hashlib
    from apps.users.models import TelegramLinkToken

    if telegram_id <= 0 or telegram_id >= SYNTHETIC_TELEGRAM_ID_BASE:
        raise AppError(400, "Telegram ID noto'g'ri")

    if not token or not isinstance(token, str):
        raise AppError(400, "Token kiritilmadi")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    with transaction.atomic():
        link_record = (
            TelegramLinkToken.objects.select_for_update()
            .filter(token_hash=token_hash)
            .first()
        )
        if not link_record:
            raise AppError(404, "Bog'lash havolasi topilmadi yoki yaroqsiz")

        if link_record.is_used:
            raise AppError(400, "Ushbu havola allaqachon ishlatilgan")

        if link_record.expires_at < timezone.now():
            raise AppError(400, "Bog'lash havolasining amal qilish muddati tugagan")

        app_user = User.objects.select_for_update().get(pk=link_record.user_id)
        old_synthetic_id = app_user.telegram_id

        # Telegram ID boshqa akkauntga tegishlimi?
        existing_tg_user = (
            User.objects.select_for_update()
            .filter(telegram_id=telegram_id)
            .exclude(pk=app_user.pk)
            .first()
        )
        if existing_tg_user:
            if existing_tg_user.phone and existing_tg_user.phone != app_user.phone:
                raise AppError(
                    409,
                    f"Bu Telegram hisobi allaqachon boshqa telefon raqamga bog'langan: {mask_phone(existing_tg_user.phone)}",
                )
            # Unlinked telegram foydalanuvchisi (bot yoki mini-app orqali avval kirgan bo'lsa)
            # Natijalarni birlashtiramiz (merging)
            app_user.score += existing_tg_user.score
            existing_achs = (
                existing_tg_user.unlocked_achievements
                if isinstance(existing_tg_user.unlocked_achievements, list)
                else []
            )
            app_achs = (
                app_user.unlocked_achievements
                if isinstance(app_user.unlocked_achievements, list)
                else []
            )
            app_user.unlocked_achievements = list(dict.fromkeys(app_achs + existing_achs))
            app_user.current_streak = max(app_user.current_streak, existing_tg_user.current_streak)
            if existing_tg_user.premium_until and (
                not app_user.premium_until or existing_tg_user.premium_until > app_user.premium_until
            ):
                app_user.premium_until = existing_tg_user.premium_until

            # Unique constraint uchun mavjud yozuvni o'chiramiz
            existing_tg_user.delete()

        # Bog'langan barcha jadvallardagi yozuvlarni ko'chiramiz
        _migrate_user_records(old_synthetic_id, telegram_id)

        # Foydalanuvchini yangilaymiz
        app_user.telegram_id = telegram_id
        if username:
            app_user.username = username
        if first_name and not app_user.first_name:
            app_user.first_name = first_name
        if last_name and not app_user.last_name:
            app_user.last_name = last_name
        app_user.auth_provider = AUTH_PROVIDER_BOTH
        app_user.save()

        # Tokenni ishlatilgan deb belgilaymiz
        link_record.is_used = True
        link_record.used_at = timezone.now()
        link_record.used_by_telegram_id = telegram_id
        link_record.save()

        app_user.bump_token_version()

    logger.info(
        "auth_telegram_link_confirmed",
        extra={
            "event": "auth_telegram_link_confirmed",
            "user_pk": app_user.pk,
            "telegram_id": telegram_id,
            "old_id": old_synthetic_id,
        },
    )
    return app_user


def link_telegram_account(*, app_user: User, telegram_id: int, username: str | None) -> User:
    """Telefon akkauntini haqiqiy Telegram akkaunti bilan bog'laydi (initData orqali to'g'ridan-to'g'ri)."""
    return confirm_telegram_link_token(
        token="",
        telegram_id=telegram_id,
        username=username,
    ) if False else _legacy_link_telegram_account(app_user=app_user, telegram_id=telegram_id, username=username)


def _legacy_link_telegram_account(*, app_user: User, telegram_id: int, username: str | None) -> User:
    if telegram_id <= 0 or telegram_id >= SYNTHETIC_TELEGRAM_ID_BASE:
        raise AppError(400, "Telegram ID noto'g'ri")

    if not app_user.is_app_account():
        raise AppError(409, "Bu akkaunt allaqachon Telegram'ga bog'langan")

    clash = User.objects.filter(telegram_id=telegram_id).exclude(pk=app_user.pk).first()
    if clash:
        if clash.phone and clash.phone != app_user.phone:
            raise AppError(
                409,
                f"Bu Telegram akkaunti allaqachon boshqa profilga bog'langan ({mask_phone(clash.phone)}).",
            )
        app_user.score += clash.score
        clash.delete()

    old_synthetic_id = app_user.telegram_id
    with transaction.atomic():
        _migrate_user_records(old_synthetic_id, telegram_id)
        locked = User.objects.select_for_update().get(pk=app_user.pk)
        locked.telegram_id = telegram_id
        if username:
            locked.username = username
        locked.auth_provider = AUTH_PROVIDER_BOTH
        locked.save(update_fields=["telegram_id", "username", "auth_provider", "updated_at"])

    locked.bump_token_version()

    logger.info(
        "auth_telegram_linked",
        extra={"event": "auth_telegram_linked", "user_pk": locked.pk, "telegram_id": telegram_id},
    )
    return locked


def _notify_milestone_safe() -> None:
    """Har 100-chi foydalanuvchi uchun adminlarga xabar (Telegram oqimidagi kabi).

    Hech qachon istisno ko'tarmaydi — ro'yxatdan o'tish buzilmasin.
    """
    try:
        from apps.users.repositories import _check_and_notify_milestone

        _check_and_notify_milestone()
    except Exception:  # noqa: BLE001
        logger.warning("auth: milestone tekshiruvi muvaffaqiyatsiz", exc_info=True)


def serialize_user(user: User) -> dict:
    """Mobil ilova uchun foydalanuvchi profili."""
    return {
        "id": str(user.pk),
        "telegramId": user.telegram_id,
        "phone": user.phone,
        "email": user.email,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "username": user.username,
        "displayName": user.display_name,
        "score": user.score,
        "language": user.language,
        "currentStreak": user.current_streak,
        # Ochilgan yutuq ID'lari — profil ekranida "ochilgan/yopiq" holatini
        # ko'rsatish uchun. Manba: apps/users/achievements.py
        "unlockedAchievements": (
            [str(a) for a in user.unlocked_achievements]
            if isinstance(user.unlocked_achievements, list)
            else []
        ),
        "authProvider": user.auth_provider,
        "isAppAccount": user.is_app_account(),
        "hasPassword": user.has_usable_password(),
        "isPremium": user.is_premium_active(),
        "premiumUntil": user.premium_until.isoformat() if user.premium_until else None,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }
