"""Milestone xabarnomasi uchun testlar.

Testlar qamrovi:
  1. 100-chi foydalanuvchi yaratilganda milestone yoziladi va xabar yuboriladi.
  2. 101-chi foydalanuvchi — milestone qayta yuborilmaydi.
  3. Qaytayotgan foydalanuvchi (upsert) — hech narsa yuborilmaydi.
  4. 200-chi foydalanuvchi — keyingi milestone ishlaydi.
  5. Telegram xatosi loginga ta'sir qilmaydi.
"""
from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase

from apps.users.models import MilestoneState, User
from apps.users import repositories as repo

# send_message_sync repositories._check_and_notify_milestone ichida
# "from apps.core.telegram_notifier import send_message_sync" orqali
# import qilinadi — shuning uchun manba modulini patchlaymiz.
_SEND_PATH = "apps.core.telegram_notifier.send_message_sync"
_ADMINS_PATH = "apps.users.repositories._get_all_admin_telegram_ids"


def _make_user(telegram_id: int, first_name: str = "Test") -> dict:
    return repo.upsert_user(
        telegram_id=telegram_id,
        first_name=first_name,
        last_name=None,
        username=None,
    )


class MilestoneNotificationTest(TestCase):
    """Milestone xabarnomasi to'g'ri ishlashini tekshiradi."""

    @patch(_ADMINS_PATH, return_value=[111111])
    @patch(_SEND_PATH)
    def test_100th_user_triggers_milestone(self, mock_send, mock_admins):
        # 99 ta foydalanuvchi yaratamiz (bulk, upsert'ni chetlab o'tamiz)
        for i in range(1, 100):
            User.objects.create(telegram_id=i, first_name=f"User{i}")

        # 100-chi — upsert orqali (yangi foydalanuvchi)
        _make_user(telegram_id=100)

        # MilestoneState yangilangan bo'lishi kerak
        state = MilestoneState.objects.get(id=1)
        self.assertEqual(state.last_celebrated_user_milestone, 100)

        # Xabar admin'ga yuborilishi kerak
        mock_send.assert_called_once()
        args, _ = mock_send.call_args
        self.assertEqual(args[0], 111111)
        self.assertIn("100", args[1])

    @patch(_ADMINS_PATH, return_value=[111111])
    @patch(_SEND_PATH)
    def test_101st_user_does_not_retrigger(self, mock_send, mock_admins):
        # 100 ta foydalanuvchi + milestone allaqachon yozilgan
        for i in range(1, 101):
            User.objects.create(telegram_id=i, first_name=f"User{i}")
        MilestoneState.objects.create(id=1, last_celebrated_user_milestone=100)

        # 101-chi — milestone 100 allaqachon tabriklanган
        _make_user(telegram_id=101)

        mock_send.assert_not_called()

    @patch(_ADMINS_PATH, return_value=[111111])
    @patch(_SEND_PATH)
    def test_returning_user_does_not_trigger(self, mock_send, mock_admins):
        # 99 ta foydalanuvchi — milestone yetmagan
        for i in range(1, 100):
            User.objects.create(telegram_id=i, first_name=f"User{i}")

        # 1-chi qaytib keladi — yangi emas
        _make_user(telegram_id=1, first_name="UpdatedName")

        mock_send.assert_not_called()

    @patch(_ADMINS_PATH, return_value=[111111])
    @patch(_SEND_PATH)
    def test_200th_user_triggers_next_milestone(self, mock_send, mock_admins):
        # 199 ta foydalanuvchi + milestone 100 allaqachon yozilgan
        for i in range(1, 200):
            User.objects.create(telegram_id=i, first_name=f"User{i}")
        MilestoneState.objects.create(id=1, last_celebrated_user_milestone=100)

        _make_user(telegram_id=200)

        state = MilestoneState.objects.get(id=1)
        self.assertEqual(state.last_celebrated_user_milestone, 200)

        mock_send.assert_called_once()
        args, _ = mock_send.call_args
        self.assertIn("200", args[1])

    @patch(_ADMINS_PATH, return_value=[111111])
    @patch(_SEND_PATH, side_effect=Exception("Telegram down"))
    def test_telegram_failure_does_not_break_login(self, mock_send, mock_admins):
        """Telegram xatosi loginga ta'sir qilmasligi kerak."""
        for i in range(1, 100):
            User.objects.create(telegram_id=i, first_name=f"User{i}")

        # Bu exception tashlamaydi — login normal davom etadi
        result = _make_user(telegram_id=100)

        self.assertIsNotNone(result)
        self.assertEqual(result["telegramId"], 100)


class AccountDeletionTests(TestCase):
    """Google Play Store hisobni o'chirish sahifasi va servisi uchun testlar."""

    def setUp(self):
        self.test_user = User.objects.create(
            telegram_id=99887766,
            phone="+998909876543",
            first_name="Jasur",
            last_name="Karimov",
            username="jasur_k",
            display_name="Jasur Karimov",
            score=500,
            current_streak=3,
        )
        self.test_user.set_password("SecurePassword2026!")
        self.test_user.save()

    def test_public_get_delete_account_page(self):
        """GET /delete-account hamma uchun ochiq va barcha talab qilingan bandlarni o'z ichiga oladi."""
        res = self.client.get("/delete-account")
        self.assertEqual(res.status_code, 200)
        content = res.content.decode("utf-8")
        self.assertIn("Zakovat App", content)
        self.assertIn("Hisob va shaxsiy ma'lumotlarni o'chirish", content)
        self.assertIn("5 yil", content)  # Moliyaviy ma'lumotlar saqlanish muddati
        self.assertIn("90 kun", content)  # Audit xavfsizlik loglari
        self.assertIn("180 kun", content)  # O'chirish so'rovi audit qaydi
        self.assertIn("support@zakovat-app.uz", content)

        # Trailing slash va HEAD so'rovlarini ham tekshiramiz
        res_slash = self.client.get("/delete-account/")
        self.assertEqual(res_slash.status_code, 200)
        res_head = self.client.head("/delete-account")
        self.assertEqual(res_head.status_code, 200)

    def test_ownership_protection_cannot_delete_with_wrong_password(self):
        """Begona odam parolsiz yoki noto'g'ri parol bilan hisobni o'chira olmaydi."""
        res = self.client.post(
            "/delete-account",
            data={
                "action": "delete_password",
                "identifier": "+998909876543",
                "password": "WrongPassword123!",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(res.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.test_user.pk).exists())

    def test_delete_with_password_success_and_data_cleanup(self):
        """To'g'ri parol kiritilganda hisob va bog'liq barcha ma'lumotlar to'liq o'chiriladi."""
        from apps.daily.models import UserDailyStreak
        from apps.game_results.models import GameResult
        from apps.users.models import AccountDeletionRequest, UserScoreLog

        # Bog'liq namunaviy ma'lumotlar yaratamiz
        GameResult.objects.create(
            telegram_id=self.test_user.telegram_id,
            correct_count=10,
            total_count=10,
            round_score=250,
        )
        UserDailyStreak.objects.create(
            telegram_id=self.test_user.telegram_id,
            current_streak=3,
        )
        UserScoreLog.objects.create(
            telegram_id=self.test_user.telegram_id,
            amount=50,
            source="answer",
        )

        res = self.client.post(
            "/delete-account",
            data={
                "action": "delete_password",
                "identifier": "+998909876543",
                "password": "SecurePassword2026!",
                "reason": "Test deletion",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["ok"])

        # Foydalanuvchi va uning barcha shaxsiy ma'lumotlari bazadan o'chirilgan
        self.assertFalse(User.objects.filter(phone="+998909876543").exists())
        self.assertFalse(GameResult.objects.filter(telegram_id=99887766).exists())
        self.assertFalse(UserDailyStreak.objects.filter(telegram_id=99887766).exists())
        self.assertFalse(UserScoreLog.objects.filter(telegram_id=99887766).exists())

        # Audit jurnali yozilgan, ammo shaxsiy ma'lumotlar maskalangan
        req = AccountDeletionRequest.objects.get(original_telegram_id=99887766)
        self.assertEqual(req.status, AccountDeletionRequest.STATUS_COMPLETED)
        self.assertIn("543", req.masked_phone)
        self.assertNotEqual(req.masked_phone, "+998909876543")

    def test_telegram_otp_deletion_flow(self):
        """Telegram OTP orqali hisobni o'chirish so'rovi va tasdiqlash oqimi."""
        from apps.users.deletion_service import (
            confirm_deletion_with_otp,
            start_deletion_otp_flow,
        )
        from apps.users.models import TelegramOtpChallenge

        # 1. So'rov boshlash
        init_res = start_deletion_otp_flow(identifier="+998909876543")
        self.assertTrue(init_res["ok"])
        session_token = init_res["sessionToken"]

        challenge = TelegramOtpChallenge.objects.get(
            purpose=TelegramOtpChallenge.PURPOSE_ACCOUNT_DELETION
        )
        self.assertEqual(challenge.user, self.test_user)

        # Bot link chaqiruvi simulyatsiyasi (OTP yaratish)
        bot_res = self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={"token": session_token, "telegramId": 99887766},
            content_type="application/json",
        )
        self.assertEqual(bot_res.status_code, 200)
        otp = bot_res.json()["otp"]

        # Noto'g'ri kod bilan urinish -> 400
        with self.assertRaises(Exception):
            confirm_deletion_with_otp(session_token=session_token, otp="999999")

        # To'g'ri kod bilan tasdiqlash -> 200 va hisob o'chirilishi
        result = confirm_deletion_with_otp(session_token=session_token, otp=otp)
        self.assertTrue(result["ok"])
        self.assertFalse(User.objects.filter(pk=self.test_user.pk).exists())


from django.test import override_settings


@override_settings(BOT_INTERNAL_API_KEY="test_internal_key", ADMIN_TELEGRAM_IDS=[999999])
class BotPhoneVerificationAndRecoveryTest(TestCase):
    """Bot kontakt tasdiqlash, akkauntlarni birlashtirish va parolni tiklash testlari."""

    def setUp(self):
        self.auth_headers = {"HTTP_AUTHORIZATION": "bot test_internal_key"}

    def test_bot_phone_status_and_save_phone(self):
        """Telefon holatini tekshirish va yangi kontakt saqlash."""
        # 1. Boshida telefon yo'q
        resp = self.client.get(
            "/api/users/bot-phone-status?telegramId=777666",
            **self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["hasPhone"])

        # 2. Kontakt saqlash
        save_resp = self.client.post(
            "/api/users/bot-save-phone",
            data={
                "telegramId": 777666,
                "phone": "+998 90 123 45 67",
                "firstName": "Alisher",
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(save_resp.status_code, 200)
        self.assertTrue(save_resp.json()["ok"])
        self.assertEqual(save_resp.json()["phone"], "+998901234567")

        # 3. Endi hasPhone True bo'lishi kerak
        status_resp = self.client.get(
            "/api/users/bot-phone-status?telegramId=777666",
            **self.auth_headers,
        )
        self.assertEqual(status_resp.status_code, 200)
        self.assertTrue(status_resp.json()["hasPhone"])
        self.assertEqual(status_resp.json()["phone"], "+998901234567")

    def test_bot_save_phone_merges_synthetic_app_account(self):
        """Mobil ilovadagi sintetik hisob botdagi haqiqiy profil bilan to'liq birlashadi."""
        from apps.users.models import SYNTHETIC_TELEGRAM_ID_BASE

        # Mobil ilovadan yaratilgan sintetik akkaunt
        app_user = User.objects.create(
            telegram_id=SYNTHETIC_TELEGRAM_ID_BASE + 99,
            phone="+998907778899",
            score=120,
            display_name="AppUser",
        )
        app_user.set_password("SecretPass123!")
        app_user.save()

        # Bot foydalanuvchisi
        tg_user = User.objects.create(
            telegram_id=555444,
            first_name="TgUser",
            score=50,
        )

        # Botda kontakt ulashiladi
        res = self.client.post(
            "/api/users/bot-save-phone",
            data={
                "telegramId": 555444,
                "phone": "+998907778899",
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)

        # Sintetik akkaunt o'chirilgan
        self.assertFalse(User.objects.filter(pk=app_user.pk).exists())

        # Telegram profili birlashgan ma'lumotlarni o'z ichiga oladi
        tg_user.refresh_from_db()
        self.assertEqual(tg_user.phone, "+998907778899")
        self.assertEqual(tg_user.score, 170)  # 50 + 120
        self.assertTrue(tg_user.has_usable_password())
        self.assertTrue(tg_user.check_password("SecretPass123!"))

    @patch("apps.auth_api.services.send_message_sync")
    def test_password_recovery_delivers_code_to_telegram_bot(self, mock_send):
        """Mobil ilovadan parolni tiklash so'ralganda kod darhol Telegram botga boradi."""
        from apps.auth_api import services

        user = User.objects.create(
            telegram_id=333222,
            phone="+998903332211",
            first_name="BotUser",
        )
        user.set_password("OldPassword123")
        user.save()

        recovery_res = services.start_password_recovery(identifier="+998903332211")
        self.assertTrue(recovery_res["ok"])
        session_token = recovery_res["sessionToken"]

        # Telegram botga darhol xabar yuborilgan bo'lishi kerak
        mock_send.assert_called_once()
        args, _ = mock_send.call_args
        self.assertEqual(args[0], 333222)
        message_text = args[1]
        self.assertIn("Zakovat", message_text)
        self.assertIn("Parolni tiklash", message_text)

        # Kodni matndan olamiz (<code>123456</code>)
        import re
        match = re.search(r"<code>(\d{6})</code>", message_text)
        self.assertIsNotNone(match)
        otp = match.group(1)

        # Mobil ilovadan yangi parol o'rnatiladi
        user, _ = services.verify_password_reset_otp(
            session_token=session_token,
            otp=otp,
            new_password="BrandNewPassword456!",
        )
        self.assertTrue(user.check_password("BrandNewPassword456!"))


