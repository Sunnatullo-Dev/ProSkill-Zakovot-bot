"""Quick grading sanity test."""
import django
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zakovat.settings")
django.setup()

from apps.questions.repositories import get_round_questions, get_question_by_id
from apps.answers.grading import exact_match_grade

qs = get_round_questions(count=3, category=None, difficulty=None)
for q_public in qs:
    print("=" * 60)
    print(f"Text: {q_public['text']}")
    print(f"Public options: {q_public['options']}")

    q_full = get_question_by_id(q_public["id"])
    print(f"Correct: {q_full['correctAnswer']!r}")
    print(f"Wrong:   {q_full['wrongAnswers']}")

    correct_option = q_full["correctAnswer"]
    wrong_answers = q_full.get("wrongAnswers") or []

    # Simulate backend submit_answer logic
    all_options = [q_full["correctAnswer"], *wrong_answers]
    normalized_options = {opt.strip().casefold() for opt in all_options if isinstance(opt, str)}

    user_answer = correct_option
    print(f"User submits CORRECT: {user_answer!r}")
    print(f"  In set: {user_answer.casefold() in normalized_options}")
    g = exact_match_grade(user_answer, q_full["correctAnswer"])
    print(f"  Grading: {g.status}")

    # Now try a wrong one
    if wrong_answers:
        user_answer = wrong_answers[0]
        print(f"User submits WRONG: {user_answer!r}")
        print(f"  In set: {user_answer.casefold() in normalized_options}")
        g = exact_match_grade(user_answer, q_full["correctAnswer"])
        print(f"  Grading: {g.status}")

    print()
