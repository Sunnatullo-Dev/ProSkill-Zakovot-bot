"""Interaktiv Zakovat Stoli — muhim yo'llar uchun testlar.

Test qamrovi:
  1. Xona yaratish va 6 o'yinchi qo'shilish (1-si kapitan, 7-si rad etiladi)
  2. Muxlis (spectator) qo'shilishi holatga ta'sir qilmasligi
  3. Jamoani tasdiqlash — admin tekshiruvi va 6/6 talabi
  4. Aniq 12 ta savol yuklash talabi + qayta yuklash taqiqi
  5. O'yinni boshlash — 12 savol shart
  6. Ot aylantirish — savol takrorlanmasligi
  7. Muhokama deadline himoyasi (vaqtidan oldin yakunlab bo'lmaydi)
  8. Faqat kapitan yakuniy javob bera oladi + adminga ko'rinadi, boshqalarga yo'q
  9. Admin baholash — ball hisoblash va g'olib aniqlash (6 ballga birinchi yetgan)
"""
from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.core.exceptions import AppError

from . import repositories as repo
from .models import ZtRoom


ADMIN_ID = 100
PLAYER_IDS = [201, 202, 203, 204, 205, 206]
QUESTIONS = [{"text": f"Savol {i+1}?", "answer": f"Javob{i+1}"} for i in range(12)]


def _make_room(admin_id: int = ADMIN_ID) -> dict:
    return repo.create_room(admin_telegram_id=admin_id)


def _fill_team(code: str) -> dict:
    result = {}
    for i, pid in enumerate(PLAYER_IDS):
        result = repo.join_player(code=code, telegram_id=pid, display_name=f"O'yinchi{i+1}")
    return result


class TeamFormationTest(TestCase):
    def test_first_joiner_is_captain_and_room_caps_at_six(self):
        room = _make_room()
        code = room["code"]
        state = _fill_team(code)
        self.assertEqual(state["playerCount"], 6)
        self.assertTrue(state["teamFull"])
        self.assertEqual(state["captainTelegramId"], PLAYER_IDS[0])

        with self.assertRaises(AppError) as ctx:
            repo.join_player(code=code, telegram_id=999, display_name="Ortiqcha")
        self.assertEqual(ctx.exception.status_code, 409)

    def test_spectator_join_does_not_affect_players(self):
        room = _make_room()
        code = room["code"]
        _fill_team(code)
        state = repo.join_spectator(code=code, telegram_id=555)
        self.assertEqual(state["spectatorCount"], 1)
        self.assertEqual(state["playerCount"], 6)


class ConfirmTeamTest(TestCase):
    def test_requires_room_admin(self):
        room = _make_room()
        code = room["code"]
        _fill_team(code)
        with self.assertRaises(AppError) as ctx:
            repo.confirm_team(code=code, admin_telegram_id=999)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_requires_full_team(self):
        room = _make_room()
        code = room["code"]
        repo.join_player(code=code, telegram_id=PLAYER_IDS[0], display_name="Yolg'iz")
        with self.assertRaises(AppError) as ctx:
            repo.confirm_team(code=code, admin_telegram_id=ADMIN_ID)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_confirms_when_full(self):
        room = _make_room()
        code = room["code"]
        _fill_team(code)
        state = repo.confirm_team(code=code, admin_telegram_id=ADMIN_ID)
        self.assertEqual(state["status"], "team_confirmed")


class QuestionUploadTest(TestCase):
    def _ready_room(self) -> str:
        room = _make_room()
        code = room["code"]
        _fill_team(code)
        repo.confirm_team(code=code, admin_telegram_id=ADMIN_ID)
        return code

    def test_requires_exactly_twelve(self):
        code = self._ready_room()
        with self.assertRaises(AppError):
            repo.upload_questions(code=code, admin_telegram_id=ADMIN_ID, questions=QUESTIONS[:5])

    def test_upload_then_reject_reupload(self):
        code = self._ready_room()
        state = repo.upload_questions(code=code, admin_telegram_id=ADMIN_ID, questions=QUESTIONS)
        self.assertEqual(state["questionsTotal"], 12)
        with self.assertRaises(AppError) as ctx:
            repo.upload_questions(code=code, admin_telegram_id=ADMIN_ID, questions=QUESTIONS)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_start_requires_twelve_questions(self):
        code = self._ready_room()
        with self.assertRaises(AppError):
            repo.start_game(code=code, admin_telegram_id=ADMIN_ID)
        repo.upload_questions(code=code, admin_telegram_id=ADMIN_ID, questions=QUESTIONS)
        state = repo.start_game(code=code, admin_telegram_id=ADMIN_ID)
        self.assertEqual(state["status"], "in_progress")


class GameRoundTest(TestCase):
    def _started_room(self) -> str:
        room = _make_room()
        code = room["code"]
        _fill_team(code)
        repo.confirm_team(code=code, admin_telegram_id=ADMIN_ID)
        repo.upload_questions(code=code, admin_telegram_id=ADMIN_ID, questions=QUESTIONS)
        repo.start_game(code=code, admin_telegram_id=ADMIN_ID)
        return code

    def test_spin_never_repeats_sector(self):
        # 1 ball/raund va 6 ballda g'alaba bilan o'yin hech qachon 12 raundgacha
        # cho'zilmaydi (11-raunddan keyin kamida bir tomon 6 ballga yetadi) —
        # shu sababli faqat "hech qachon takrorlanmaslik"ni va o'yin g'alaba
        # bilan yakunlanishini tekshiramiz, 12 tasi ishlatilishini emas.
        code = self._started_room()
        seen_sectors = set()
        game_over = False
        for _ in range(12):
            state = repo.spin(code=code, admin_telegram_id=ADMIN_ID)
            if state.get("ranOutOfQuestions"):
                break
            sector = state["currentQuestion"]["sector"]
            self.assertNotIn(sector, seen_sectors)
            seen_sectors.add(sector)
            room = ZtRoom.objects.get(code=code)
            room.discussion_deadline = timezone.now() - timedelta(seconds=1)
            room.save(update_fields=["discussion_deadline"])
            repo.advance_discussion_if_due(code=code)
            repo.submit_captain_answer(code=code, telegram_id=PLAYER_IDS[0], answer_text="x")
            result = repo.admin_verify(code=code, admin_telegram_id=ADMIN_ID, is_correct=(len(seen_sectors) % 2 == 0))
            if result["gameOver"]:
                game_over = True
                break
        self.assertTrue(game_over)
        self.assertLessEqual(len(seen_sectors), 12)
        self.assertEqual(len(seen_sectors), len(set(seen_sectors)))

    def test_discussion_deadline_is_enforced(self):
        code = self._started_room()
        repo.spin(code=code, admin_telegram_id=ADMIN_ID)
        with self.assertRaises(AppError) as ctx:
            repo.advance_discussion_if_due(code=code)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_only_captain_can_answer_and_answer_hidden_from_players(self):
        code = self._started_room()
        repo.spin(code=code, admin_telegram_id=ADMIN_ID)
        room = ZtRoom.objects.get(code=code)
        room.discussion_deadline = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["discussion_deadline"])
        repo.advance_discussion_if_due(code=code)

        with self.assertRaises(AppError) as ctx:
            repo.submit_captain_answer(code=code, telegram_id=PLAYER_IDS[1], answer_text="men emasman")
        self.assertEqual(ctx.exception.status_code, 403)

        state = repo.submit_captain_answer(code=code, telegram_id=PLAYER_IDS[0], answer_text="mening javobim")
        self.assertEqual(state["status"], "verifying")
        # Kapitanga (admin bo'lmagani uchun) to'g'ri javob va o'z javobi ko'rsatilmasligi kerak
        self.assertNotIn("captainAnswerText", state)
        self.assertIsNone(state["currentQuestion"].get("answer") if state["currentQuestion"] else None)

    def test_admin_verify_updates_score_and_declares_winner_at_six(self):
        code = self._started_room()
        for i in range(6):
            repo.spin(code=code, admin_telegram_id=ADMIN_ID)
            room = ZtRoom.objects.get(code=code)
            room.discussion_deadline = timezone.now() - timedelta(seconds=1)
            room.save(update_fields=["discussion_deadline"])
            repo.advance_discussion_if_due(code=code)
            repo.submit_captain_answer(code=code, telegram_id=PLAYER_IDS[0], answer_text="to'g'ri javob")
            state = repo.admin_verify(code=code, admin_telegram_id=ADMIN_ID, is_correct=True)

        self.assertEqual(state["teamScore"], 6)
        self.assertTrue(state["gameOver"])
        self.assertEqual(state["status"], "finished")
        self.assertEqual(state["winner"], "team")
