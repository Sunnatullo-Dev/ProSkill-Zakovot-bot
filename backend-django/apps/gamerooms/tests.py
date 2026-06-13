"""Online O'yin Xonasi — muhim yo'llar uchun testlar.

Test qamrovi:
  1. Xona yaratish va qo'shilish (room lifecycle)
  2. Savol push qilish — oldingi savol yopilmagan bo'lsa xato
  3. Javob berish: deadline himoyasi
  4. Javob tahrirlash (upsert)
  5. Avtomatik baholash (auto_grade)
  6. Qo'lda baholash (manual_grade)
  7. Ball hisoblash aniqligi
  8. Leak himoyasi: ishtirokchi to'g'ri javobni ko'rmasligi kerak (aktiv savol)
  9. Xona admin tekshiruvi (403)
  10. Race-safe: ikki marta auto_grade idempotent
"""
from __future__ import annotations

import time
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from apps.core.exceptions import AppError

from .models import GameQuestion, GameRoom, Participant, Submission
from . import repositories as repo


def _make_room(name="Test Xona", admin_id=100) -> dict:
    return repo.create_room(
        admin_telegram_id=admin_id,
        name=name,
        join_password="",
    )


def _start_room(code: str, admin_id: int = 100) -> dict:
    """Xonaga bitta ishtirokchi qo'shib boshlaydi."""
    repo.join_room(code=code, telegram_id=999, display_name="Test User")
    return repo.start_room(code=code, admin_telegram_id=admin_id)


def _push_q(code: str, admin_id: int = 100, body: str = "Test savol?",
            correct_answer: str = "To'g'ri", time_limit: int = 120) -> dict:
    return repo.push_question(
        code=code,
        admin_telegram_id=admin_id,
        question_type="text",
        body=body,
        correct_answer=correct_answer,
        time_limit_seconds=time_limit,
        point_value=1,
    )


# ─── 1. Xona lifecycle ───────────────────────────────────────────────────────

class RoomLifecycleTest(TestCase):

    def test_create_room_returns_code(self):
        result = _make_room()
        self.assertEqual(len(result["code"]), 6)
        self.assertEqual(result["status"], "waiting")

    def test_join_then_start(self):
        r = _make_room()
        code = r["code"]
        repo.join_room(code=code, telegram_id=555, display_name="Ali")
        state = repo.start_room(code=code, admin_telegram_id=100)
        self.assertEqual(state["status"], "active")

    def test_start_without_participants_fails(self):
        r = _make_room()
        with self.assertRaises(AppError) as ctx:
            repo.start_room(code=r["code"], admin_telegram_id=100)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_finish_room(self):
        r = _make_room()
        code = r["code"]
        _start_room(code)
        state = repo.finish_room(code=code, admin_telegram_id=100)
        self.assertEqual(state["status"], "finished")

    def test_finish_closes_active_question(self):
        r = _make_room()
        code = r["code"]
        _start_room(code)
        _push_q(code)
        # Savol hali active bo'lsa ham finish qilish kerak
        repo.finish_room(code=code, admin_telegram_id=100)
        q = GameQuestion.objects.filter(room__code=code, status="active").first()
        self.assertIsNone(q)

    def test_join_wrong_password_fails(self):
        r = repo.create_room(
            admin_telegram_id=100, name="Parolli", join_password="secret"
        )
        with self.assertRaises(AppError) as ctx:
            repo.join_room(code=r["code"], telegram_id=200, display_name="Bob",
                           join_password="wrong")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_join_with_correct_password(self):
        r = repo.create_room(
            admin_telegram_id=100, name="Parolli", join_password="secret"
        )
        result = repo.join_room(
            code=r["code"], telegram_id=200, display_name="Bob",
            join_password="secret"
        )
        self.assertIsNotNone(result)

    def test_non_admin_cannot_start(self):
        r = _make_room(admin_id=100)
        code = r["code"]
        repo.join_room(code=code, telegram_id=999, display_name="P")
        with self.assertRaises(AppError) as ctx:
            repo.start_room(code=code, admin_telegram_id=999)  # ishtirokchi, admin emas
        self.assertEqual(ctx.exception.status_code, 403)

    def test_double_finish_is_idempotent(self):
        r = _make_room()
        code = r["code"]
        _start_room(code)
        repo.finish_room(code=code, admin_telegram_id=100)
        # Ikkinchi chaqiruv xato qilmasligi kerak
        state = repo.finish_room(code=code, admin_telegram_id=100)
        self.assertEqual(state["status"], "finished")


# ─── 2. Savol push qilish ────────────────────────────────────────────────────

class QuestionPushTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)

    def test_push_question_creates_active(self):
        q = _push_q(self.code)
        self.assertEqual(q["status"], "active")
        self.assertIsNotNone(q["activatedAt"])

    def test_push_second_without_closing_fails(self):
        _push_q(self.code, body="Birinchi savol")
        with self.assertRaises(AppError) as ctx:
            _push_q(self.code, body="Ikkinchi savol")
        self.assertEqual(ctx.exception.status_code, 409)

    def test_close_then_push_next(self):
        q = _push_q(self.code, body="Birinchi")
        repo.close_question(code=self.code, admin_telegram_id=100, question_id=q["id"])
        q2 = _push_q(self.code, body="Ikkinchi")
        self.assertEqual(q2["orderIndex"], 2)

    def test_invalid_time_limit_fails(self):
        with self.assertRaises(AppError) as ctx:
            repo.push_question(
                code=self.code, admin_telegram_id=100,
                question_type="text", body="Savol?",
                time_limit_seconds=45,  # noto'g'ri
                point_value=1,
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_invalid_point_value_fails(self):
        with self.assertRaises(AppError) as ctx:
            repo.push_question(
                code=self.code, admin_telegram_id=100,
                question_type="text", body="Savol?",
                time_limit_seconds=60,
                point_value=5,  # noto'g'ri
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_invalid_question_type_fails(self):
        with self.assertRaises(AppError) as ctx:
            repo.push_question(
                code=self.code, admin_telegram_id=100,
                question_type="video",  # noto'g'ri
                body="Savol?",
                time_limit_seconds=60,
                point_value=1,
            )
        self.assertEqual(ctx.exception.status_code, 400)


# ─── 3. Javob berish + deadline himoyasi ─────────────────────────────────────

class SubmitAnswerTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)
        q = _push_q(self.code, correct_answer="Toshkent", time_limit=120)
        self.question_id = q["id"]

    def test_participant_can_submit(self):
        result = repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Toshkent"
        )
        self.assertIn("submissionId", result)
        self.assertEqual(result["answerText"], "Toshkent")

    def test_non_participant_cannot_submit(self):
        with self.assertRaises(AppError) as ctx:
            repo.submit_answer(
                code=self.code, telegram_id=777,  # qo'shilmagan
                question_id=self.question_id, answer_text="Toshkent"
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_closed_question_rejects_answer(self):
        repo.close_question(code=self.code, admin_telegram_id=100,
                            question_id=self.question_id)
        with self.assertRaises(AppError) as ctx:
            repo.submit_answer(
                code=self.code, telegram_id=999,
                question_id=self.question_id, answer_text="Toshkent"
            )
        self.assertEqual(ctx.exception.status_code, 409)

    def test_empty_answer_rejected(self):
        with self.assertRaises(AppError) as ctx:
            repo.submit_answer(
                code=self.code, telegram_id=999,
                question_id=self.question_id, answer_text=""
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_deadline_enforcement(self):
        """Vaqt o'tgandan keyin kelgan javob rad etilishi kerak."""
        # Deadline ni o'tkazib yuborish: activated_at ni orqaga siljitamiz
        q = GameQuestion.objects.get(id=self.question_id)
        # activated_at ni 130 soniya oldin sifatida belgilaymiz (vaqt tugagan)
        past = timezone.now() - timezone.timedelta(seconds=130)
        GameQuestion.objects.filter(id=self.question_id).update(activated_at=past)

        with self.assertRaises(AppError) as ctx:
            repo.submit_answer(
                code=self.code, telegram_id=999,
                question_id=self.question_id, answer_text="Toshkent"
            )
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("Vaqt", str(ctx.exception.message))


# ─── 4. Javob tahrirlash (upsert) ────────────────────────────────────────────

class UpsertSubmissionTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)
        q = _push_q(self.code)
        self.question_id = q["id"]

    def test_edit_answer_before_deadline(self):
        repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Birinchi javob"
        )
        result = repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Yangilangan javob"
        )
        self.assertEqual(result["answerText"], "Yangilangan javob")
        # DB da faqat 1 ta submission bo'lishi kerak
        count = Submission.objects.filter(question_id=self.question_id).count()
        self.assertEqual(count, 1)

    def test_edited_answer_resets_grading(self):
        """Tahrirlanganda baholash natijalari tozalanishi kerak."""
        repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Birinchi"
        )
        # Savolni yopib baholaymiz
        repo.close_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        # Savolga to'g'ri javob qo'shamiz
        repo.set_correct_answer(
            code=self.code, admin_telegram_id=100,
            question_id=self.question_id, correct_answer="Birinchi"
        )
        repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        sub = Submission.objects.get(question_id=self.question_id)
        self.assertIsNotNone(sub.graded_by)

        # Savolni qayta ochamiz — boshqa savol kabi (eski savolga yangi tahrir)
        # Ammo deadline o'tgan bo'lgani uchun to'g'ridan submit qilolmaymiz.
        # Bu test faqat upsert logikasini tekshiradi (graded_by reset).
        # Baholangandan keyin tahrirlansa — graded_by = "" bo'lishi kerak
        # (bu submit_answer ichidagi logika).
        # Deadline tekshiruvini test uchun bypass qilamiz:
        GameQuestion.objects.filter(id=self.question_id).update(
            status="active",
            activated_at=timezone.now(),
        )
        repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Yangilangan"
        )
        sub.refresh_from_db()
        self.assertEqual(sub.graded_by, "")
        self.assertIsNone(sub.is_correct)


# ─── 5. Avtomatik baholash ───────────────────────────────────────────────────

class AutoGradeTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)
        q = _push_q(self.code, correct_answer="Toshkent")
        self.question_id = q["id"]
        # Ishtirokchi javob beradi
        repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Toshkent"
        )
        repo.close_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )

    def test_auto_grade_exact_match(self):
        result = repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        self.assertEqual(result["gradedCount"], 1)
        self.assertEqual(result["correctCount"], 1)
        sub = Submission.objects.get(question_id=self.question_id)
        self.assertTrue(sub.is_correct)
        self.assertEqual(sub.points_awarded, 1)
        self.assertEqual(sub.graded_by, "auto")

    def test_auto_grade_incorrect(self):
        # Javobni yangilash
        Submission.objects.filter(question_id=self.question_id).update(
            answer_text="Samarqand", graded_by=""
        )
        result = repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        # Gemini mock bo'lmasa local check — "Samarqand" != "Toshkent"
        # incorrect bo'lishi kerak
        self.assertEqual(result["gradedCount"], 1)
        sub = Submission.objects.get(question_id=self.question_id)
        # Lokal check: incorrect
        self.assertFalse(sub.is_correct)
        self.assertEqual(sub.points_awarded, 0)

    def test_auto_grade_no_correct_answer_fails(self):
        """correct_answer bo'sh bo'lsa xato."""
        r2 = _make_room(name="No Answer Room", admin_id=200)
        code2 = r2["code"]
        _start_room(code2, admin_id=200)
        q2 = repo.push_question(
            code=code2, admin_telegram_id=200,
            question_type="text", body="Savol?",
            correct_answer="",  # bo'sh
            time_limit_seconds=60, point_value=1,
        )
        repo.close_question(code=code2, admin_telegram_id=200, question_id=q2["id"])
        with self.assertRaises(AppError) as ctx:
            repo.auto_grade_question(
                code=code2, admin_telegram_id=200, question_id=q2["id"]
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_auto_grade_idempotent(self):
        """Ikki marta chaqirilsa ikkinchisida gradedCount=0, skippedCount=1."""
        repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        result2 = repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        self.assertEqual(result2["gradedCount"], 0)
        self.assertEqual(result2["skippedCount"], 1)

    def test_points_added_to_participant(self):
        repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        p = Participant.objects.get(room__code=self.code, telegram_id=999)
        self.assertEqual(p.total_points, 1)


# ─── 6. Qo'lda baholash ──────────────────────────────────────────────────────

class ManualGradeTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)
        q = _push_q(self.code, correct_answer="Toshkent")
        self.question_id = q["id"]
        repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Toshkent"
        )
        sub = Submission.objects.get(question_id=self.question_id)
        self.submission_id = sub.id

    def test_manual_mark_correct(self):
        result = repo.manual_grade_submission(
            code=self.code, admin_telegram_id=100,
            submission_id=self.submission_id, is_correct=True,
        )
        self.assertTrue(result["isCorrect"])
        self.assertEqual(result["pointsAwarded"], 1)

    def test_manual_mark_incorrect(self):
        result = repo.manual_grade_submission(
            code=self.code, admin_telegram_id=100,
            submission_id=self.submission_id, is_correct=False,
        )
        self.assertFalse(result["isCorrect"])
        self.assertEqual(result["pointsAwarded"], 0)

    def test_manual_override_changes_score(self):
        """Avval to'g'ri, keyin noto'g'ri — ball farqi hisoblanadi."""
        repo.manual_grade_submission(
            code=self.code, admin_telegram_id=100,
            submission_id=self.submission_id, is_correct=True,
        )
        p = Participant.objects.get(room__code=self.code, telegram_id=999)
        self.assertEqual(p.total_points, 1)

        # Override: noto'g'ri
        repo.manual_grade_submission(
            code=self.code, admin_telegram_id=100,
            submission_id=self.submission_id, is_correct=False,
        )
        p.refresh_from_db()
        self.assertEqual(p.total_points, 0)

    def test_non_admin_cannot_grade(self):
        with self.assertRaises(AppError) as ctx:
            repo.manual_grade_submission(
                code=self.code, admin_telegram_id=999,  # ishtirokchi
                submission_id=self.submission_id, is_correct=True,
            )
        self.assertEqual(ctx.exception.status_code, 403)


# ─── 7. Ball hisoblash ───────────────────────────────────────────────────────

class ScoringTest(TestCase):

    def test_multi_question_scoring(self):
        """Bir nechta savol — ballar to'g'ri qo'shiladi."""
        r = _make_room()
        code = r["code"]
        _start_room(code)

        for body, correct, answer, expected_pts in [
            ("Savol 1", "Javob 1", "Javob 1", 1),   # to'g'ri
            ("Savol 2", "Javob 2", "Noto'g'ri", 0), # noto'g'ri
            ("Savol 3", "Javob 3", "Javob 3", 1),   # to'g'ri
        ]:
            q = _push_q(code, body=body, correct_answer=correct)
            repo.submit_answer(
                code=code, telegram_id=999,
                question_id=q["id"], answer_text=answer
            )
            repo.close_question(code=code, admin_telegram_id=100, question_id=q["id"])
            repo.set_correct_answer(
                code=code, admin_telegram_id=100,
                question_id=q["id"], correct_answer=correct
            )
            repo.auto_grade_question(
                code=code, admin_telegram_id=100, question_id=q["id"]
            )

        p = Participant.objects.get(room__code=code, telegram_id=999)
        self.assertEqual(p.total_points, 2)

    def test_point_value_respected(self):
        """point_value=3 bo'lsa 3 ball berilishi kerak."""
        r = _make_room()
        code = r["code"]
        _start_room(code)
        q = repo.push_question(
            code=code, admin_telegram_id=100,
            question_type="text", body="Qiyin savol",
            correct_answer="Javob", time_limit_seconds=60, point_value=3,
        )
        repo.submit_answer(
            code=code, telegram_id=999, question_id=q["id"], answer_text="Javob"
        )
        repo.close_question(code=code, admin_telegram_id=100, question_id=q["id"])
        repo.auto_grade_question(
            code=code, admin_telegram_id=100, question_id=q["id"]
        )
        p = Participant.objects.get(room__code=code, telegram_id=999)
        self.assertEqual(p.total_points, 3)


# ─── 8. Leak himoyasi ────────────────────────────────────────────────────────

class LeakPreventionTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)
        q = _push_q(self.code, correct_answer="Sir javob")
        self.question_id = q["id"]

    def test_correct_answer_hidden_while_active(self):
        """Aktiv savol paytida to'g'ri javob ko'rinmasligi kerak."""
        state = repo.get_room_state(self.code, viewer_telegram_id=999)
        cq = state["currentQuestion"]
        self.assertIsNotNone(cq)
        self.assertIsNone(cq["correctAnswer"])

    def test_correct_answer_visible_after_close(self):
        """Savol yopilgandan keyin to'g'ri javob ko'rinishi kerak."""
        repo.close_question(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        # Yopilgan savol endi current_question emas — to'g'ridan saralashda
        # leaderboard orqali emas, balki serializer orqali ko'ramiz.
        # Shuning uchun to'g'ridan savol so'raymiz (admin view):
        state = repo.get_room_state(self.code, viewer_telegram_id=100, is_admin_view=True)
        # Joriy savol yo'q (yopilgan), lekin boshqa ishtirokchi javobini ko'rmoqchi
        # bo'lsak — leaderboard'da to'g'ri javob bo'lmaydi (u savol darajasida).
        # Test: yopilgan savolda admin barcha javoblarni ko'rishi mumkin
        subs = repo.get_question_submissions(
            code=self.code, admin_telegram_id=100, question_id=self.question_id
        )
        self.assertEqual(subs["correctAnswer"], "Sir javob")

    def test_admin_view_sees_correct_answer_when_active(self):
        """Admin is_admin_view=True bilan aktiv savolda to'g'ri javobni ko'rishi kerak."""
        state = repo.get_room_state(
            self.code, viewer_telegram_id=100, is_admin_view=True
        )
        cq = state["currentQuestion"]
        self.assertIsNotNone(cq)
        self.assertEqual(cq["correctAnswer"], "Sir javob")

    def test_participant_cannot_see_others_answers_while_active(self):
        """Aktiv savol paytida boshqa ishtirokchining javobi ko'rinmasligi kerak.

        Bu test get_room_state'dagi mySubmission faqat o'z javobini qaytarishini tekshiradi.
        """
        # Boshqa ishtirokchi qo'shilsin
        repo.join_room(code=self.code, telegram_id=888, display_name="Boshqa")
        repo.submit_answer(
            code=self.code, telegram_id=888,
            question_id=self.question_id, answer_text="Boshqa javob"
        )
        # 999-ishtirokchi o'z javobini ko'radi
        repo.submit_answer(
            code=self.code, telegram_id=999,
            question_id=self.question_id, answer_text="Mening javobim"
        )
        state = repo.get_room_state(self.code, viewer_telegram_id=999)
        cq = state["currentQuestion"]
        # mySubmission faqat 999-ishtirokchining javobi
        if cq and cq.get("mySubmission"):
            self.assertEqual(cq["mySubmission"]["answerText"], "Mening javobim")
        # to'g'ri javob yashirin
        self.assertIsNone(cq["correctAnswer"])


# ─── 9. Statistika va leaderboard ────────────────────────────────────────────

class StatsAndLeaderboardTest(TestCase):

    def setUp(self):
        r = _make_room()
        self.code = r["code"]
        _start_room(self.code)

    def test_leaderboard_sorted_by_points(self):
        # Ikkinchi ishtirokchi qo'shamiz
        repo.join_room(code=self.code, telegram_id=888, display_name="Ali")
        q = _push_q(self.code, correct_answer="Javob")
        repo.submit_answer(
            code=self.code, telegram_id=999, question_id=q["id"], answer_text="Javob"
        )
        repo.submit_answer(
            code=self.code, telegram_id=888, question_id=q["id"], answer_text="Noto'g'ri"
        )
        repo.close_question(code=self.code, admin_telegram_id=100, question_id=q["id"])
        repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=q["id"]
        )
        lb = repo.get_leaderboard(self.code, viewer_telegram_id=999)
        # 999 birinchi bo'lishi kerak (1 ball)
        self.assertEqual(lb["leaderboard"][0]["telegramId"], 999)
        self.assertEqual(lb["leaderboard"][0]["rank"], 1)

    def test_stats_returns_correct_rates(self):
        q = _push_q(self.code, correct_answer="Javob")
        repo.submit_answer(
            code=self.code, telegram_id=999, question_id=q["id"], answer_text="Javob"
        )
        repo.close_question(code=self.code, admin_telegram_id=100, question_id=q["id"])
        repo.auto_grade_question(
            code=self.code, admin_telegram_id=100, question_id=q["id"]
        )
        stats = repo.get_room_stats(code=self.code, admin_telegram_id=100)
        self.assertEqual(stats["questionStats"][0]["correctCount"], 1)
        self.assertEqual(stats["questionStats"][0]["correctRate"], 100.0)
