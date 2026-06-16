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
