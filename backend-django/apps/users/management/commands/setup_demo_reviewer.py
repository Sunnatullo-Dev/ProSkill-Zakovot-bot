"""Google Play tekshiruvchilari (Reviewers) uchun demo hisob yaratish buyrug'i.

Foydalanish:
    python manage.py setup_demo_reviewer
    python manage.py setup_demo_reviewer --phone +998901234567 --password "MySecretPass!123"

Ushbu buyruq:
1. Google Play reviewer uchun to'liq tasdiqlangan, xavfsiz demo profil yaratadi yoki yangilaydi.
2. Namuna o'yin natijalari (GameResult), reyting ballari va yutuqlarni (Achievements) to'ldiradi.
3. Reviewer login qilishi uchun tashqi Telegram bot yoki SMS qurilmasi talab qilinmaydi.
4. Google Play Console uchun tayyor ingliz tilidagi yo'riqnomani chop etadi.
"""
from __future__ import annotations

import os
from datetime import date, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.daily.models import UserDailyStreak
from apps.game_results.models import GameResult
from apps.users.models import (
    AUTH_PROVIDER_BOTH,
    BotAdmin,
    SYNTHETIC_TELEGRAM_ID_BASE,
    User,
)


DEFAULT_REVIEWER_PHONE = os.getenv("REVIEWER_PHONE", "+998901234567")
DEFAULT_REVIEWER_PASSWORD = os.getenv("REVIEWER_PASSWORD", "Zakovat2026!Review")
REVIEWER_TELEGRAM_ID = SYNTHETIC_TELEGRAM_ID_BASE + 999  # 2000000000999


class Command(BaseCommand):
    help = "Google Play reviewer uchun demo hisobni yaratish yoki yangilash"

    def add_arguments(self, parser):
        parser.add_argument(
            "--phone",
            type=str,
            default=DEFAULT_REVIEWER_PHONE,
            help=f"Demo telefon raqami (default: {DEFAULT_REVIEWER_PHONE})",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=DEFAULT_REVIEWER_PASSWORD,
            help=f"Demo parol (default: {DEFAULT_REVIEWER_PASSWORD})",
        )
        parser.add_argument(
            "--score",
            type=int,
            default=1250,
            help="Boshlang'ich ball miqdori (default: 1250)",
        )
        parser.add_argument(
            "--reset-stats",
            action="store_true",
            help="Eski sinov o'yinlari va statistikani tozalash",
        )

    def handle(self, *args, **options):
        phone = options["phone"].strip()
        if not phone.startswith("+"):
            phone = f"+{phone}"
        raw_password = options["password"]
        score = options["score"]
        reset_stats = options["reset_stats"]

        self.stdout.write(f"[*] Demo reviewer hisobi tayyorlanmoqda ({phone})...")

        # 1. User yaratish yoki yangilash
        user = User.objects.filter(phone=phone).first()
        if not user:
            user = User.objects.filter(telegram_id=REVIEWER_TELEGRAM_ID).first()

        achievements = [
            "first_win",
            "streak_3",
            "smart_cookie",
            "speed_demon",
            "night_owl",
        ]

        if not user:
            user = User(
                telegram_id=REVIEWER_TELEGRAM_ID,
                phone=phone,
                first_name="Google",
                last_name="Reviewer",
                display_name="Google Reviewer",
                username="google_reviewer",
                score=score,
                current_streak=5,
                language="uz-latn",
                unlocked_achievements=achievements,
                auth_provider=AUTH_PROVIDER_BOTH,
            )
        else:
            user.phone = phone
            user.first_name = "Google"
            user.last_name = "Reviewer"
            user.display_name = "Google Reviewer"
            user.username = "google_reviewer"
            user.score = score
            user.current_streak = 5
            user.language = "uz-latn"
            user.unlocked_achievements = achievements
            user.auth_provider = AUTH_PROVIDER_BOTH

        user.set_password(raw_password)
        user.save()

        # 2. Xavfsizlik: hech qachon reviewerga admin huquqi berilmasin
        BotAdmin.objects.filter(telegram_id=user.telegram_id).delete()

        # 3. Namuna o'yin natijalari (GameResult)
        if reset_stats:
            GameResult.objects.filter(telegram_id=user.telegram_id).delete()

        existing_games = GameResult.objects.filter(telegram_id=user.telegram_id).count()
        if existing_games < 5:
            # Namuna o'yinlar yaratamiz
            sample_games = [
                (10, 10, 250),
                (8, 10, 180),
                (9, 10, 220),
                (10, 10, 260),
                (7, 10, 150),
            ]
            for c_count, t_count, r_score in sample_games:
                GameResult.objects.create(
                    telegram_id=user.telegram_id,
                    correct_count=c_count,
                    total_count=t_count,
                    round_score=r_score,
                )

        # 4. Daily Streak
        UserDailyStreak.objects.update_or_create(
            telegram_id=user.telegram_id,
            defaults={
                "current_streak": 5,
                "longest_streak": 12,
                "last_date": date.today() - timedelta(days=1),
            },
        )

        self.stdout.write(self.style.SUCCESS("[+] Demo reviewer hisobi muvaffaqiyatli saqlandi!\n"))

        instructions = f"""
================================================================================
GOOGLE PLAY CONSOLE — APP ACCESS (SIGN-IN DETAILS):
================================================================================
Phone / Account: {phone}
Password:        {raw_password}
Display Name:    Google Reviewer
Username:        google_reviewer
Test OTP:        123456 (used if testing password recovery)

Instructions for Reviewers (Copy & paste into Google Play Console):
--------------------------------------------------------------------------------
1. Open the Zakovat app.
2. In the Login screen, enter the phone number: {phone}
3. Enter the password: {raw_password}
4. Tap "Kirish" (Sign In).
5. The account is pre-verified and connects immediately without requiring
   an external Telegram verification code or SMS device.
6. The test account contains pre-populated quiz history, achievements, and
   leaderboard score to allow testing all tabs (Home, Leaderboard, Svoyak, Profile).
7. If testing the password recovery ("Parolni unutdingizmi?") feature with this
   number, enter test OTP code: 123456.
================================================================================
"""
        self.stdout.write(instructions)
