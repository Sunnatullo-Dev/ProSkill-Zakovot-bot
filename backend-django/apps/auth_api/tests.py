"""Mobil auth (JWT) uchun testlar.

Qamrov:
  - telefon normalizatsiyasi va parol siyosati
  - ro'yxatdan o'tish / kirish / user enumeration himoyasi
  - access token bilan himoyalangan endpointga kirish
  - refresh rotatsiyasi va eski tokenning bekor qilinishi
  - parol o'zgarganda barcha sessiyalarning kuchini yo'qotishi
  - sintetik telegram_id ajratilishi va mavjud o'yin mantig'i bilan mosligi
"""
from __future__ import annotations

import hashlib

from django.core.cache import cache
from django.test import Client, TestCase, override_settings

from apps.auth_api.credentials import normalize_phone, validate_password
from apps.auth_api.tokens import decode_access, issue_token_pair
from apps.core.exceptions import AppError
from apps.core.sms_provider import (
    DisabledSmsProvider,
    get_sms_provider,
    send_verification_sms,
)
from apps.users.models import (
    SYNTHETIC_TELEGRAM_ID_BASE,
    TelegramOtpChallenge,
    User,
)


VALID_PASSWORD = "zakovat2026"


def _register(client: Client, phone="+998901234567", password=VALID_PASSWORD, first_name="Amirxon"):
    return client.post(
        "/api/auth/register",
        data={"phone": phone, "password": password, "firstName": first_name},
        content_type="application/json",
    )


class PhoneNormalizationTest(TestCase):
    def test_accepts_common_uzbek_formats(self):
        for raw in [
            "+998901234567",
            "998901234567",
            "901234567",
            "0901234567",
            "+998 90 123 45 67",
            "(90) 123-45-67",
        ]:
            self.assertEqual(normalize_phone(raw), "+998901234567", msg=raw)

    def test_rejects_garbage(self):
        for raw in ["", "   ", "abc", "+1", "12345"]:
            with self.assertRaises(AppError, msg=raw):
                normalize_phone(raw)


class PasswordPolicyTest(TestCase):
    def test_requires_letter_and_digit_and_length(self):
        for bad in ["short1", "alllettersonly", "12345678", "        "]:
            with self.assertRaises(AppError, msg=bad):
                validate_password(bad)

    def test_accepts_reasonable_password(self):
        self.assertEqual(validate_password("zakovat2026"), "zakovat2026")


class RegistrationTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_register_returns_tokens_and_user(self):
        res = _register(self.client)
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertIn("accessToken", body["tokens"])
        self.assertIn("refreshToken", body["tokens"])
        self.assertEqual(body["user"]["phone"], "+998901234567")
        self.assertTrue(body["user"]["isAppAccount"])
        self.assertTrue(body["user"]["hasPassword"])
        self.assertFalse(body["isAdmin"])

    def test_synthetic_telegram_id_is_allocated(self):
        _register(self.client)
        user = User.objects.get(phone="+998901234567")
        self.assertGreater(user.telegram_id, SYNTHETIC_TELEGRAM_ID_BASE)
        self.assertTrue(user.is_app_account())

    def test_second_account_gets_distinct_id(self):
        _register(self.client, phone="+998901111111")
        _register(self.client, phone="+998902222222")
        ids = set(User.objects.values_list("telegram_id", flat=True))
        self.assertEqual(len(ids), 2)

    def test_duplicate_phone_rejected(self):
        _register(self.client)
        res = _register(self.client)
        self.assertEqual(res.status_code, 409)

    def test_password_is_hashed_not_stored_plain(self):
        _register(self.client)
        user = User.objects.get(phone="+998901234567")
        self.assertNotIn(VALID_PASSWORD, user.password_hash)
        self.assertTrue(user.password_hash.startswith("pbkdf2_"))
        self.assertTrue(user.check_password(VALID_PASSWORD))


class LoginTest(TestCase):
    def setUp(self):
        cache.clear()
        _register(self.client)

    def _login(self, phone="+998901234567", password=VALID_PASSWORD):
        return self.client.post(
            "/api/auth/login/password",
            data={"phone": phone, "password": password},
            content_type="application/json",
        )

    def test_login_success(self):
        res = self._login()
        self.assertEqual(res.status_code, 200)
        self.assertIn("accessToken", res.json()["tokens"])

    def test_wrong_password_rejected(self):
        self.assertEqual(self._login(password="wrongpass1").status_code, 401)

    def test_unknown_phone_gives_same_message_as_wrong_password(self):
        """User enumeration himoyasi: ikkala holat bir xil javob berishi shart."""
        unknown = self._login(phone="+998909999999")
        wrong = self._login(password="wrongpass1")
        self.assertEqual(unknown.status_code, wrong.status_code)
        self.assertEqual(unknown.json()["message"], wrong.json()["message"])


class AuthenticatedRequestTest(TestCase):
    def setUp(self):
        cache.clear()
        self.tokens = _register(self.client).json()["tokens"]

    def _auth(self, token=None):
        return {"HTTP_AUTHORIZATION": f"Bearer {token or self.tokens['accessToken']}"}

    def test_me_requires_token(self):
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_me_with_valid_token(self):
        res = self.client.get("/api/auth/me", **self._auth())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["phone"], "+998901234567")

    def test_garbage_token_rejected(self):
        self.assertEqual(
            self.client.get("/api/auth/me", **self._auth("not.a.token")).status_code, 401
        )

    def test_refresh_token_cannot_be_used_as_access(self):
        """Access va refresh alohida sirlar bilan imzolanadi."""
        res = self.client.get("/api/auth/me", **self._auth(self.tokens["refreshToken"]))
        self.assertEqual(res.status_code, 401)

    def test_existing_game_endpoint_works_with_jwt(self):
        """JWT mavjud (o'zgartirilmagan) endpointlarda ham ishlashi shart."""
        res = self.client.get("/api/users/leaderboard", **self._auth())
        self.assertEqual(res.status_code, 200)
        self.assertIn("users", res.json())


class RefreshRotationTest(TestCase):
    def setUp(self):
        cache.clear()
        self.tokens = _register(self.client).json()["tokens"]

    def _refresh(self, token):
        return self.client.post(
            "/api/auth/token/refresh",
            data={"refreshToken": token},
            content_type="application/json",
        )

    def test_refresh_returns_new_pair(self):
        res = self._refresh(self.tokens["refreshToken"])
        self.assertEqual(res.status_code, 200)
        new_tokens = res.json()["tokens"]
        self.assertNotEqual(new_tokens["refreshToken"], self.tokens["refreshToken"])

    def test_old_refresh_is_revoked_after_rotation(self):
        self._refresh(self.tokens["refreshToken"])
        second = self._refresh(self.tokens["refreshToken"])
        self.assertEqual(second.status_code, 401)

    def test_new_access_token_works(self):
        new_access = self._refresh(self.tokens["refreshToken"]).json()["tokens"]["accessToken"]
        res = self.client.get("/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {new_access}")
        self.assertEqual(res.status_code, 200)


class LogoutTest(TestCase):
    def setUp(self):
        cache.clear()
        self.tokens = _register(self.client).json()["tokens"]

    def test_logout_revokes_refresh(self):
        self.client.post(
            "/api/auth/logout",
            data={"refreshToken": self.tokens["refreshToken"]},
            content_type="application/json",
        )
        res = self.client.post(
            "/api/auth/token/refresh",
            data={"refreshToken": self.tokens["refreshToken"]},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 401)

    def test_logout_all_invalidates_access_token(self):
        self.client.post(
            "/api/auth/logout/all",
            HTTP_AUTHORIZATION=f"Bearer {self.tokens['accessToken']}",
        )
        res = self.client.get(
            "/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {self.tokens['accessToken']}"
        )
        self.assertEqual(res.status_code, 401)


class ChangePasswordTest(TestCase):
    def setUp(self):
        cache.clear()
        self.tokens = _register(self.client).json()["tokens"]

    def test_change_password_invalidates_old_tokens(self):
        res = self.client.patch(
            "/api/auth/password",
            data={"currentPassword": VALID_PASSWORD, "newPassword": "yangiparol2026"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.tokens['accessToken']}",
        )
        self.assertEqual(res.status_code, 200)
        fresh = res.json()["tokens"]["accessToken"]

        # Eski token endi ishlamaydi
        old = self.client.get(
            "/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {self.tokens['accessToken']}"
        )
        self.assertEqual(old.status_code, 401)

        # Yangisi ishlaydi
        new = self.client.get("/api/auth/me", HTTP_AUTHORIZATION=f"Bearer {fresh}")
        self.assertEqual(new.status_code, 200)

    def test_wrong_current_password_rejected(self):
        res = self.client.patch(
            "/api/auth/password",
            data={"currentPassword": "notmypassword1", "newPassword": "yangiparol2026"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.tokens['accessToken']}",
        )
        self.assertEqual(res.status_code, 400)


class ServerTimeTest(TestCase):
    def test_time_endpoint_shape(self):
        res = self.client.get("/api/time")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIsInstance(body["epochMs"], int)
        self.assertIn("iso", body)
        self.assertEqual(body["timezone"], "Asia/Tashkent")


class TelegramFlowUntouchedTest(TestCase):
    """Mavjud Telegram oqimi buzilmaganini tasdiqlaydi."""

    def test_whoami_still_works_without_auth(self):
        res = self.client.get("/api/auth/whoami")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["isAuthenticated"])

    @override_settings(IS_PRODUCTION=False)
    def test_telegram_login_endpoint_still_reachable(self):
        res = self.client.post(
            "/api/auth/login", data={"initData": ""}, content_type="application/json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["telegramId"], 0)


class TelegramAccountLinkingTest(TestCase):
    def setUp(self):
        cache.clear()
        reg_res = _register(self.client, phone="+998901234567")
        self.tokens = reg_res.json()["tokens"]
        self.user = User.objects.get(phone="+998901234567")

    def _auth(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.tokens['accessToken']}"}

    def test_create_link_token_returns_url_and_token(self):
        res = self.client.post("/api/auth/telegram-link/create-token", **self._auth())
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("token", body)
        self.assertIn("linkUrl", body)
        self.assertIn("start=link_", body["linkUrl"])
        self.assertEqual(body["expiresInSeconds"], 900)

    def test_confirm_link_token_links_account(self):
        # 1. Token yaratamiz
        create_res = self.client.post("/api/auth/telegram-link/create-token", **self._auth())
        token = create_res.json()["token"]

        # 2. Telegram bot nomidan tasdiqlaymiz
        confirm_res = self.client.post(
            "/api/auth/telegram-link/confirm",
            data={
                "token": token,
                "telegramId": 123456789,
                "username": "amirxon_tg",
                "firstName": "Amirxon",
            },
            content_type="application/json",
        )
        self.assertEqual(confirm_res.status_code, 200)
        self.assertTrue(confirm_res.json()["ok"])
        self.assertEqual(confirm_res.json()["user"]["telegramId"], 123456789)
        self.assertEqual(confirm_res.json()["user"]["username"], "amirxon_tg")

        # DB tekshiramiz
        self.user.refresh_from_db()
        self.assertEqual(self.user.telegram_id, 123456789)
        self.assertEqual(self.user.auth_provider, "both")

    def test_reusing_link_token_is_rejected(self):
        create_res = self.client.post("/api/auth/telegram-link/create-token", **self._auth())
        token = create_res.json()["token"]

        # 1-marta — muvaffaqiyatli
        res1 = self.client.post(
            "/api/auth/telegram-link/confirm",
            data={"token": token, "telegramId": 123456789},
            content_type="application/json",
        )
        self.assertEqual(res1.status_code, 200)

        # 2-marta — rad etiladi (replay himoyasi)
        res2 = self.client.post(
            "/api/auth/telegram-link/confirm",
            data={"token": token, "telegramId": 123456789},
            content_type="application/json",
        )
        self.assertEqual(res2.status_code, 400)

    def test_expired_token_is_rejected(self):
        from datetime import timedelta
        from django.utils import timezone
        from apps.users.models import TelegramLinkToken

        create_res = self.client.post("/api/auth/telegram-link/create-token", **self._auth())
        token = create_res.json()["token"]

        # Token muddatini orqaga suramiz
        TelegramLinkToken.objects.update(expires_at=timezone.now() - timedelta(minutes=1))

        res = self.client.post(
            "/api/auth/telegram-link/confirm",
            data={"token": token, "telegramId": 123456789},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)

    def test_conflict_with_different_phone_account_rejected(self):
        # Boshqa foydalanuvchi allaqachon shu Telegram ID'ga ega va telefoni bor
        User.objects.create(
            telegram_id=987654321,
            phone="+998909998877",
            first_name="Boshqa odam",
            auth_provider="both",
        )

        create_res = self.client.post("/api/auth/telegram-link/create-token", **self._auth())
        token = create_res.json()["token"]

        res = self.client.post(
            "/api/auth/telegram-link/confirm",
            data={"token": token, "telegramId": 987654321},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)

    def test_merges_unlinked_telegram_bot_user_score_and_data(self):
        from apps.game_results.models import GameResult

        # Botdan kirgan unlinked foydalanuvchi (telefonsiz, 50 ball to'plagan)
        bot_user = User.objects.create(
            telegram_id=555666777,
            score=50,
            first_name="Bot Foydalanuvchi",
            auth_provider="telegram",
        )

        # Mobil ilovada foydalanuvchimiz 20 ball to'plagan va o'yin natijasi bor
        self.user.score = 20
        self.user.save()
        GameResult.objects.create(
            telegram_id=self.user.telegram_id,
            correct_count=5,
            total_count=10,
            round_score=20,
        )

        create_res = self.client.post("/api/auth/telegram-link/create-token", **self._auth())
        token = create_res.json()["token"]

        res = self.client.post(
            "/api/auth/telegram-link/confirm",
            data={"token": token, "telegramId": 555666777},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        self.user.refresh_from_db()
        # Ballar yig'indisi: 20 + 50 = 70 ball
        self.assertEqual(self.user.score, 70)
        self.assertEqual(self.user.telegram_id, 555666777)

        # Eski GameResult ham yangi telegram_id ga o'tgan
        self.assertTrue(GameResult.objects.filter(telegram_id=555666777).exists())


class TelegramOtpAuthTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_telegram_registration_flow_success(self):
        # 1. Start registration from mobile app
        start_res = self.client.post(
            "/api/auth/telegram-otp/register/start",
            data={
                "phone": "+998901112233",
                "password": "strongPassword123",
                "firstName": "Sardor",
                "lastName": "Aliyev",
                "language": "uz-latn",
            },
            content_type="application/json",
        )
        self.assertEqual(start_res.status_code, 200)
        data = start_res.json()
        session_token = data["sessionToken"]
        self.assertIn("botUsername", data)
        self.assertIn("deepLink", data)
        self.assertTrue(data["deepLink"].startswith("https://t.me/"))

        # User is not created in DB yet!
        self.assertFalse(User.objects.filter(phone="+998901112233").exists())

        # 2. User opens Telegram Bot -> Bot calls bot-link
        bot_res = self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={
                "token": session_token,
                "telegramId": 987654321,
                "username": "sardor_tg",
                "firstName": "Sardor",
            },
            content_type="application/json",
        )
        self.assertEqual(bot_res.status_code, 200)
        bot_data = bot_res.json()
        self.assertEqual(bot_data["purpose"], "register")
        otp = bot_data["otp"]
        self.assertEqual(len(otp), 6)

        # 3. User enters 6-digit OTP in mobile app
        verify_res = self.client.post(
            "/api/auth/telegram-otp/register/verify",
            data={
                "sessionToken": session_token,
                "otp": otp,
            },
            content_type="application/json",
        )
        self.assertEqual(verify_res.status_code, 201)
        verify_data = verify_res.json()
        self.assertIn("tokens", verify_data)
        self.assertEqual(verify_data["user"]["phone"], "+998901112233")
        self.assertEqual(verify_data["user"]["telegramId"], 987654321)

        # Verified in DB
        created_user = User.objects.get(phone="+998901112233")
        self.assertEqual(created_user.telegram_id, 987654321)
        self.assertEqual(created_user.first_name, "Sardor")
        self.assertTrue(created_user.check_password("strongPassword123"))

    def test_telegram_registration_duplicate_phone_rejected(self):
        User.objects.create(telegram_id=111, phone="+998901112233")
        start_res = self.client.post(
            "/api/auth/telegram-otp/register/start",
            data={
                "phone": "+998901112233",
                "password": "strongPassword123",
                "firstName": "Test",
            },
            content_type="application/json",
        )
        self.assertEqual(start_res.status_code, 409)

    def test_telegram_registration_wrong_otp_and_attempt_limit(self):
        start_res = self.client.post(
            "/api/auth/telegram-otp/register/start",
            data={
                "phone": "+998909998877",
                "password": "strongPassword123",
                "firstName": "Jasur",
            },
            content_type="application/json",
        )
        session_token = start_res.json()["sessionToken"]
        self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={"token": session_token, "telegramId": 123456789},
            content_type="application/json",
        )

        # 1-4 wrong attempts: 400
        for _ in range(4):
            res = self.client.post(
                "/api/auth/telegram-otp/register/verify",
                data={"sessionToken": session_token, "otp": "000000"},
                content_type="application/json",
            )
            self.assertEqual(res.status_code, 400)

        # 5th wrong attempt: 400
        res5 = self.client.post(
            "/api/auth/telegram-otp/register/verify",
            data={"sessionToken": session_token, "otp": "000000"},
            content_type="application/json",
        )
        self.assertEqual(res5.status_code, 400)

        # 6th attempt: 429 locked
        res6 = self.client.post(
            "/api/auth/telegram-otp/register/verify",
            data={"sessionToken": session_token, "otp": "000000"},
            content_type="application/json",
        )
        self.assertEqual(res6.status_code, 429)

    def test_password_recovery_and_reset_flow(self):
        from django.utils import timezone
        from apps.users.models import TelegramOtpChallenge

        # Create user with password and real Telegram ID
        user = User.objects.create(
            telegram_id=554433221,
            phone="+998905554433",
            first_name="Zafar",
            auth_provider="both",
        )
        user.set_password("OldPassword123")
        user.save()
        initial_token_version = user.token_version

        # 1. Forgot password request
        forgot_res = self.client.post(
            "/api/auth/telegram-otp/forgot-password",
            data={"phone": "+998905554433"},
            content_type="application/json",
        )
        self.assertEqual(forgot_res.status_code, 200)
        data = forgot_res.json()
        session_token = data["sessionToken"]

        # Bot challenge exists in DB
        challenge = TelegramOtpChallenge.objects.filter(user=user, purpose="password_reset").first()
        self.assertIsNotNone(challenge)

        # Bot delivers or generates OTP
        bot_res = self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={"token": session_token, "telegramId": 554433221},
            content_type="application/json",
        )
        self.assertEqual(bot_res.status_code, 200)
        otp = bot_res.json()["otp"]

        # 2. User enters OTP and new password
        reset_res = self.client.post(
            "/api/auth/telegram-otp/reset-password",
            data={
                "sessionToken": session_token,
                "otp": otp,
                "newPassword": "NewStrongPassword456",
            },
            content_type="application/json",
        )
        self.assertEqual(reset_res.status_code, 200)

        # Old password fails
        login_old = self.client.post(
            "/api/auth/login/password",
            data={"phone": "+998905554433", "password": "OldPassword123"},
            content_type="application/json",
        )
        self.assertEqual(login_old.status_code, 401)

        # New password succeeds
        login_new = self.client.post(
            "/api/auth/login/password",
            data={"phone": "+998905554433", "password": "NewStrongPassword456"},
            content_type="application/json",
        )
        self.assertEqual(login_new.status_code, 200)

        # Token version bumped (old sessions revoked)
        user.refresh_from_db()
        self.assertGreater(user.token_version, initial_token_version)

    def test_password_recovery_anti_enumeration_unknown_user(self):
        res = self.client.post(
            "/api/auth/telegram-otp/forgot-password",
            data={"phone": "+998990000000"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["ok"])
        self.assertIn("sessionToken", data)
        self.assertIn("deepLink", data)

    def test_otp_resend_cooldown(self):
        start_res = self.client.post(
            "/api/auth/telegram-otp/register/start",
            data={"phone": "+998907776655", "password": "passWord123", "firstName": "Ali"},
            content_type="application/json",
        )
        session_token = start_res.json()["sessionToken"]
        self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={"token": session_token, "telegramId": 77665544},
            content_type="application/json",
        )

        # Resend immediately should be blocked by 60s cooldown
        resend_res = self.client.post(
            "/api/auth/telegram-otp/resend",
            data={"sessionToken": session_token},
            content_type="application/json",
        )
        self.assertEqual(resend_res.status_code, 429)
        self.assertIn("soniya kuting", resend_res.json()["message"])

    def test_bot_link_contact_verification_and_ownership(self):
        start_res = self.client.post(
            "/api/auth/telegram-otp/register/start",
            data={
                "phone": "+998901112233",
                "password": "strongPassword123",
                "firstName": "Sardor",
            },
            content_type="application/json",
        )
        session_token = start_res.json()["sessionToken"]

        # Attempt 1: Contact phone doesn't match registration phone -> fails (400)
        mismatch_res = self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={
                "token": session_token,
                "telegramId": 987654321,
                "phone": "+998909998877",
                "isOwner": True,
            },
            content_type="application/json",
        )
        self.assertEqual(mismatch_res.status_code, 400)
        self.assertIn("mos kelmadi", mismatch_res.json()["message"])

        # Attempt 2: Not owner's contact -> fails (400)
        not_owner_res = self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={
                "token": session_token,
                "telegramId": 987654321,
                "phone": "+998901112233",
                "isOwner": False,
            },
            content_type="application/json",
        )
        self.assertEqual(not_owner_res.status_code, 400)
        self.assertIn("o'zingizning shaxsiy", not_owner_res.json()["message"])

        # Attempt 3: Matching phone and isOwner=True -> succeeds (200)
        success_res = self.client.post(
            "/api/auth/telegram-otp/bot-link",
            data={
                "token": session_token,
                "telegramId": 987654321,
                "phone": "+998901112233",
                "isOwner": True,
            },
            content_type="application/json",
        )
        self.assertEqual(success_res.status_code, 200)
        payload = success_res.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["deliveryChannel"], "telegram")

        challenge = TelegramOtpChallenge.objects.get(
            session_token_hash=hashlib.sha256(session_token.encode("utf-8")).hexdigest()
        )
        self.assertTrue(challenge.pending_payload.get("contact_verified"))
        self.assertTrue(challenge.pending_payload.get("contact_is_owner"))

    def test_sms_provider_abstraction(self):
        provider = DisabledSmsProvider()
        self.assertFalse(provider.is_configured)
        result = provider.send_sms(phone="+998901234567", text="Test")
        self.assertFalse(result.success)
        self.assertIn("sozlanmagan", result.error)

        current_provider = get_sms_provider()
        self.assertIsInstance(current_provider, DisabledSmsProvider)

        res = send_verification_sms("+998901234567", "123456")
        self.assertFalse(res.success)

    def test_setup_demo_reviewer_command_and_deterministic_otp(self):
        from io import StringIO
        from django.core.management import call_command
        from apps.daily.models import UserDailyStreak
        from apps.game_results.models import GameResult
        from apps.users.models import BotAdmin

        out = StringIO()
        call_command("setup_demo_reviewer", stdout=out)
        output_str = out.getvalue()
        self.assertIn("GOOGLE PLAY CONSOLE", output_str)

        reviewer = User.objects.get(username="google_reviewer")
        self.assertEqual(reviewer.phone, "+998901234567")
        self.assertFalse(BotAdmin.objects.filter(telegram_id=reviewer.telegram_id).exists())
        self.assertTrue(reviewer.check_password("Zakovat2026!Review"))

        self.assertEqual(GameResult.objects.filter(telegram_id=reviewer.telegram_id).count(), 5)
        self.assertTrue(UserDailyStreak.objects.filter(telegram_id=reviewer.telegram_id).exists())
        self.assertGreaterEqual(len(reviewer.unlocked_achievements), 5)

        # Reviewer password recovery gets deterministic OTP '123456'
        recov_res = self.client.post(
            "/api/auth/telegram-otp/forgot-password",
            data={"phone": "+998901234567"},
            content_type="application/json",
        )
        self.assertEqual(recov_res.status_code, 200)
        session_token = recov_res.json()["sessionToken"]

        recov_token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()
        challenge = TelegramOtpChallenge.objects.get(session_token_hash=recov_token_hash)
        expected_otp_hash = hashlib.sha256(f"123456:{session_token}".encode("utf-8")).hexdigest()
        self.assertEqual(challenge.otp_hash, expected_otp_hash)

        reset_res = self.client.post(
            "/api/auth/telegram-otp/reset-password",
            data={
                "sessionToken": session_token,
                "otp": "123456",
                "newPassword": "NewReviewerPassword2026!",
            },
            content_type="application/json",
        )
        self.assertEqual(reset_res.status_code, 200)

        login_res = self.client.post(
            "/api/auth/login/password",
            data={"phone": "+998901234567", "password": "NewReviewerPassword2026!"},
            content_type="application/json",
        )
        self.assertEqual(login_res.status_code, 200)


