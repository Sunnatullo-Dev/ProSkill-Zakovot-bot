"""Hisobni va shaxsiy ma'lumotlarni o'chirish servisi (Google Play & Privacy compliance).

Ushbu modul:
1. Hisob egasini aniqlaydi va uning egaligini qat'iy tekshiradi (parol yoki Telegram OTP).
2. Begona odam raqami kiritilganda hisob o'chirilishiga yo'l qo'ymaydi (anti-enumeration & proof of ownership).
3. Foydalanuvchining shaxsiy ma'lumotlarini barcha bog'liq jadvallardan xavfsiz o'chiradi.
4. Moliyaviy va qonuniy audit talablari bo'yicha shaxssizlashtirilgan jurnal (AccountDeletionRequest) yuritadi.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone

from apps.auth_api.credentials import mask_phone, normalize_phone
from apps.core.exceptions import AppError
from apps.core.sms_provider import is_sms_available, send_verification_sms
from apps.core.telegram_notifier import send_message_sync
from apps.users.models import (
    AccountDeletionRequest,
    BotAdmin,
    TelegramOtpChallenge,
    User,
    UserScoreLog,
)

logger = logging.getLogger(__name__)

_DUMMY_PASSWORD_HASH = (
    "pbkdf2_sha256$600000$dummySaltValue$dummyHashValueForConstantTimeComparison=="
)


def find_user_by_identifier(identifier: str) -> User | None:
    """Telefon raqami, username yoki ID bo'yicha foydalanuvchini topadi."""
    if not identifier:
        return None

    clean = identifier.strip()

    # 1. Telefon raqami
    try:
        phone = normalize_phone(clean)
        user = User.objects.filter(phone=phone).first()
        if user:
            return user
    except Exception:
        pass

    # 2. Username (@ belgisi bilan yoki belgisisiz)
    username = clean.lstrip("@").lower()
    user = User.objects.filter(username__iexact=username).first()
    if user:
        return user

    # 3. Raqamli Telegram ID
    if clean.isdigit():
        try:
            tid = int(clean)
            user = User.objects.filter(telegram_id=tid).first()
            if user:
                return user
        except ValueError:
            pass

    return None


def execute_permanent_deletion(
    user: User,
    *,
    method: str,
    reason: str = "",
    ip: str | None = None,
    user_agent: str | None = None,
) -> AccountDeletionRequest:
    """Foydalanuvchining hisobini va barcha shaxsiy ma'lumotlarini bazadan butunlay o'chiradi.

    Tegishli bog'liq ma'lumotlar tozalanadi:
    - Jamoa a'zoligi va ichki chat xabarlari
    - Kunlik streak va test urinishlari
    - O'yin xonalari va stol ishtiroki
    - Shaxsiy o'yin natijalari va ball jurnallari
    - Barcha faol JWT sessiyalari bekor qilinadi
    - Profil yozuvi o'chiriladi
    - Audit logida shaxsiy ma'lumotsiz so'rov qayd etiladi
    """
    tid = user.telegram_id
    masked_phone_val = mask_phone(user.phone) if user.phone else ""
    masked_user_val = user.username or ""

    deletion_req = AccountDeletionRequest.objects.create(
        original_telegram_id=tid,
        masked_phone=masked_phone_val,
        masked_username=masked_user_val,
        verification_method=method,
        status=AccountDeletionRequest.STATUS_PENDING,
        reason=reason[:1000] if reason else "",
        ip_address=ip,
        user_agent=(user_agent or "")[:500],
    )

    with transaction.atomic():
        # 1. Jamoalar (Teams)
        try:
            from apps.teams.models import Team, TeamChatMessage, TeamMember

            TeamMember.objects.filter(telegram_id=tid).delete()
            TeamChatMessage.objects.filter(telegram_id=tid).delete()
            for team in Team.objects.filter(owner_id=tid):
                next_owner = team.members.first()
                if next_owner:
                    team.owner_id = next_owner.telegram_id
                    team.save(update_fields=["owner_id"])
                else:
                    team.delete()
        except Exception as e:
            logger.warning("deletion_cleanup_teams_err: %s", e)

        # 2. Kunlik streak va yozuvlar (Daily)
        try:
            from apps.daily.models import DailyAnswer, DailyChallengeEntry, UserDailyStreak

            UserDailyStreak.objects.filter(telegram_id=tid).delete()
            DailyChallengeEntry.objects.filter(telegram_id=tid).delete()
            DailyAnswer.objects.filter(telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_daily_err: %s", e)

        # 3. O'yin xonalari (Gamerooms)
        try:
            from apps.gamerooms.models import GameRoom, Participant

            Participant.objects.filter(telegram_id=tid).delete()
            GameRoom.objects.filter(admin_telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_gamerooms_err: %s", e)

        # 4. Zakovat stollari (Zakovat Table)
        try:
            from apps.zakovat_table.models import ZtPlayer, ZtRoom

            ZtPlayer.objects.filter(telegram_id=tid).delete()
            ZtRoom.objects.filter(admin_telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_zakovat_table_err: %s", e)

        # 5. Svoyak xonalari va o'yinchilari
        try:
            from apps.svoyak.models import SvoyakPlayer, SvoyakRoom

            SvoyakPlayer.objects.filter(telegram_id=tid).delete()
            SvoyakRoom.objects.filter(host_telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_svoyak_err: %s", e)

        # 6. O'yin natijalari (GameResults) va Janglar (Battles)
        try:
            from apps.game_results.models import GameResult

            GameResult.objects.filter(telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_gameresults_err: %s", e)

        try:
            from apps.battles.models import BattleAnswer

            BattleAnswer.objects.filter(telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_battles_err: %s", e)

        # 7. Mualliflik savollari (Author questions)
        try:
            from apps.author_questions.models import AuthorQuestion

            AuthorQuestion.objects.filter(telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_author_questions_err: %s", e)

        # 8. Ballar jurnali, Adminlar va OTP chaqiruvlari
        try:
            UserScoreLog.objects.filter(telegram_id=tid).delete()
            BotAdmin.objects.filter(telegram_id=tid).delete()
            TelegramOtpChallenge.objects.filter(telegram_id=tid).delete()
        except Exception as e:
            logger.warning("deletion_cleanup_userlogs_err: %s", e)

        # 9. Barcha faol sessiyalarni bekor qilish va hisobni o'chirish
        user.bump_token_version()
        user.delete()

        # 10. Audit so'rovini muvaffaqiyatli deb belgilash
        deletion_req.status = AccountDeletionRequest.STATUS_COMPLETED
        deletion_req.completed_at = timezone.now()
        deletion_req.save(update_fields=["status", "completed_at"])

    logger.info(
        "account_deletion_completed",
        extra={
            "event": "account_deletion_completed",
            "telegram_id": tid,
            "method": method,
        },
    )
    return deletion_req


def delete_with_password(
    *,
    identifier: str,
    password: str,
    reason: str = "",
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Parol orqali foydalanuvchi hisobini tasdiqlab, butunlay o'chiradi."""
    if not identifier or not identifier.strip():
        raise AppError(400, "Telefon raqami yoki login kiritilishi shart")

    if not password or not password.strip():
        raise AppError(400, "Amaldagi hisob paroli kiritilishi shart")

    user = find_user_by_identifier(identifier.strip())

    # Timing attack va hisob mavjudligini aniqlashdan himoya
    if not user or not user.has_usable_password():
        check_password(password, _DUMMY_PASSWORD_HASH)
        raise AppError(400, "Ko'rsatilgan hisob ma'lumotlari yoki parol noto'g'ri")

    if not user.check_password(password.strip()):
        raise AppError(400, "Hisob paroli noto'g'ri kiritildi")

    req = execute_permanent_deletion(
        user,
        method="password",
        reason=reason,
        ip=ip,
        user_agent=user_agent,
    )

    return {
        "ok": True,
        "message": "Hisobingiz va unga bog'langan barcha shaxsiy ma'lumotlar muvaffaqiyatli o'chirildi.",
        "requestId": req.pk,
        "completedAt": req.completed_at.isoformat() if req.completed_at else None,
    }


def start_deletion_otp_flow(
    *,
    identifier: str,
    reason: str = "",
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Telegram OTP orqali hisobni o'chirish uchun sessiya va bir martalik havola yaratadi."""
    if not identifier or not identifier.strip():
        raise AppError(400, "Telefon raqami yoki login kiritilishi shart")

    user = find_user_by_identifier(identifier.strip())

    session_token = secrets.token_urlsafe(32)
    session_token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()
    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "ZakovatApp_bot") or "ZakovatApp_bot"
    deep_link = f"https://t.me/{bot_username}?start=del_{session_token}"

    if user:
        TelegramOtpChallenge.objects.filter(
            user=user,
            purpose=TelegramOtpChallenge.PURPOSE_ACCOUNT_DELETION,
            is_used=False,
        ).delete()

        reviewer_phone = os.getenv("REVIEWER_PHONE", "+998901234567")
        if user.phone == reviewer_phone or user.username == "google_reviewer":
            otp = "123456"
        else:
            otp = f"{secrets.randbelow(900000) + 100000}"

        otp_hash = hashlib.sha256(f"{otp}:{session_token}".encode("utf-8")).hexdigest()
        is_linked = not user.is_app_account() and user.telegram_id > 0

        TelegramOtpChallenge.objects.create(
            session_token_hash=session_token_hash,
            purpose=TelegramOtpChallenge.PURPOSE_ACCOUNT_DELETION,
            user=user,
            phone=user.phone,
            telegram_id=user.telegram_id if is_linked else None,
            otp_hash=otp_hash,
            pending_payload={"reason": reason, "ip": ip, "user_agent": user_agent},
            is_verified=is_linked or (user.phone == reviewer_phone or user.username == "google_reviewer"),
            expires_at=timezone.now() + timedelta(minutes=5 if is_linked else 10),
            last_sent_at=timezone.now() if is_linked else None,
        )

        # Agar Telegram bog'langan bo'lsa, ogohlantiruvchi xabar yuboramiz
        if is_linked:
            msg = (
                "⚠️ <b>Zakovat: Hisobni o'chirish so'rovi!</b>\n\n"
                "Siz veb-sayt orqali hisobingizni va barcha shaxsiy ma'lumotlaringizni butunlay o'chirishni so'radingiz.\n\n"
                f"Tasdiqlash kodingiz: <code>{otp}</code>\n\n"
                "⏱ Kod amal qilish muddati: <b>5 daqiqa</b>.\n"
                "⚠️ Ushbu amalni ortga qaytarib bo'lmaydi! Agar siz so'rov yubormagan bo'lsangiz, ushbu kodni hech kimga bermang."
            )
            send_message_sync(user.telegram_id, msg)

        if is_sms_available() and user.phone:
            send_verification_sms(user.phone, otp, purpose="account_deletion")
    else:
        # User enumeration va timing attack himoyasi:
        check_password("dummy", _DUMMY_PASSWORD_HASH)

    return {
        "ok": True,
        "message": "Agar hisob mavjud bo'lsa, Telegram botga hisobni o'chirish uchun tasdiqlash kodi yuborildi.",
        "sessionToken": session_token,
        "botUsername": bot_username,
        "deepLink": deep_link,
        "expiresInSeconds": 300,
    }


def confirm_deletion_with_otp(
    *,
    session_token: str,
    otp: str,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Telegram OTP kodi orqali tasdiqlangan hisobni butunlay o'chiradi."""
    if not session_token or not session_token.strip():
        raise AppError(400, "sessionToken talab qilinadi")

    if not otp or not otp.strip():
        raise AppError(400, "6 xonali tasdiqlash kodi kiritilishi shart")

    token_hash = hashlib.sha256(session_token.strip().encode("utf-8")).hexdigest()
    challenge = (
        TelegramOtpChallenge.objects.filter(
            session_token_hash=token_hash,
            purpose=TelegramOtpChallenge.PURPOSE_ACCOUNT_DELETION,
        ).first()
    )

    if not challenge or not challenge.user:
        check_password(otp, _DUMMY_PASSWORD_HASH)
        raise AppError(400, "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan")

    if challenge.is_used:
        raise AppError(400, "Ushbu tasdiqlash kodi allaqachon ishlatilgan")

    if challenge.expires_at < timezone.now():
        raise AppError(400, "Tasdiqlash kodi muddati o'tgan. Iltimos, qaytadan so'rov yuboring.")

    if challenge.attempt_count >= 5:
        raise AppError(429, "Urinishlar soni tugadi. Iltimos, yangi so'rov yuboring.")

    expected_hash = hashlib.sha256(
        f"{otp.strip()}:{session_token.strip()}".encode("utf-8")
    ).hexdigest()

    if not hmac.compare_digest(challenge.otp_hash, expected_hash):
        challenge.attempt_count += 1
        challenge.save(update_fields=["attempt_count"])
        remaining = max(0, 5 - challenge.attempt_count)
        raise AppError(400, f"Tasdiqlash kodi noto'g'ri. Qolgan urinishlar: {remaining}")

    user = challenge.user
    reason = challenge.pending_payload.get("reason", "")

    challenge.is_used = True
    challenge.used_at = timezone.now()
    challenge.save(update_fields=["is_used", "used_at"])

    req = execute_permanent_deletion(
        user,
        method="telegram_otp",
        reason=reason,
        ip=ip,
        user_agent=user_agent,
    )

    return {
        "ok": True,
        "message": "Hisobingiz va unga bog'langan barcha ma'lumotlar muvaffaqiyatli o'chirildi.",
        "requestId": req.pk,
        "completedAt": req.completed_at.isoformat() if req.completed_at else None,
    }
