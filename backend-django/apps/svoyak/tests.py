from __future__ import annotations

from unittest.mock import patch

from django.test import SimpleTestCase, TestCase

from . import repositories as repo
from .models import SvoyakCategory, SvoyakPlayer, SvoyakQuestion, SvoyakRoom


class FreeAnswerMatchingTest(SimpleTestCase):
    def test_ignores_case_punctuation_and_apostrophe(self):
        self.assertTrue(repo._free_answer_matches_locally("Temuriylar", "temuriylar"))
        self.assertTrue(repo._free_answer_matches_locally("O'zbekiston", "ozbekiston"))
        self.assertTrue(repo._free_answer_matches_locally("Alisher Navoiy", "NAVOIY"))

    def test_allows_single_letter_typo_for_text_answers(self):
        self.assertTrue(repo._free_answer_matches_locally("Navoiy", "Navoi"))
        self.assertTrue(repo._free_answer_matches_locally("Toshkent", "Toshken"))
        self.assertTrue(repo._free_answer_matches_locally("Amir Temur", "Amir Temr"))

    def test_does_not_fuzzy_match_numbers_or_short_answers(self):
        self.assertFalse(repo._free_answer_matches_locally("1991", "1992"))
        self.assertFalse(repo._free_answer_matches_locally("ot", "ol"))


class AutoAnswerScoringTest(TestCase):
    def test_auto_answer_accepts_single_letter_typo_without_gemini(self):
        category = SvoyakCategory.objects.create(name="Tarix", is_active=True)
        SvoyakQuestion.objects.create(
            category=category,
            value_tier=10,
            text="O'zbekiston poytaxti?",
            correct_answer="Toshkent",
            wrong_answers=[],
            question_type="text",
            is_active=True,
        )

        created = repo.create_room(
            host_telegram_id=100,
            host_display_name="Host",
            auto_category_id=category.id,
        )
        code = created["code"]
        repo.join_room(code=code, telegram_id=200, display_name="Ali")
        repo.start_game(code=code, telegram_id=100)

        room = SvoyakRoom.objects.get(code=code)
        settings = dict(room.settings)
        settings["question_started_at_ms"] = repo._now_ms() - repo.READING_TIME_MS - 100
        room.settings = settings
        room.save(update_fields=["settings"])

        with patch("apps.answers.gemini.check_answer", side_effect=AssertionError("Gemini should not be called")):
            state = repo.submit_auto_answer(
                code=code,
                telegram_id=100,
                answer_text="toshken",
            )

        self.assertTrue(state["autoState"]["myAttempt"]["isCorrect"])
        player = SvoyakPlayer.objects.get(room__code=code, telegram_id=100)
        self.assertEqual(player.score, 10)
