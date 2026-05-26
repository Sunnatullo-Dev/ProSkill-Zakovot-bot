"""Demo uchun 10 ta savol qo'shadi — bot orqali qo'shishga ehtiyoj bo'lmasa.

Foydalanish:
    python manage.py seed_demo_questions
    python manage.py seed_demo_questions --force  # mavjudlarni o'chiradi va qaytadan qo'shadi

Har bir savol A/B/C/D rejimida (3 ta noto'g'ri variant bilan) — demo'da
tezda ko'rsatish uchun ideal. Variantlar real va o'qishga arziydigan.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.questions.models import Question


DEMO_QUESTIONS = [
    {
        "text": "O'zbekiston poytaxti qaysi shahar?",
        "correct_answer": "Toshkent",
        "wrong_answers": ["Samarqand", "Buxoro", "Andijon"],
        "category": "Geografiya",
        "difficulty": "easy",
    },
    {
        "text": "Quyosh sistemasining eng katta sayyorasi qaysi?",
        "correct_answer": "Yupiter",
        "wrong_answers": ["Saturn", "Neptun", "Yer"],
        "category": "Astronomiya",
        "difficulty": "easy",
    },
    {
        "text": "2 * 7 + 6 = ?",
        "correct_answer": "20",
        "wrong_answers": ["18", "22", "16"],
        "category": "Matematika",
        "difficulty": "easy",
    },
    {
        "text": "Amir Temur qachon vafot etgan?",
        "correct_answer": "1405",
        "wrong_answers": ["1370", "1389", "1420"],
        "category": "Tarix",
        "difficulty": "medium",
    },
    {
        "text": "Inson tanasidagi eng katta organ qaysi?",
        "correct_answer": "Teri",
        "wrong_answers": ["Jigar", "O'pka", "Yurak"],
        "category": "Biologiya",
        "difficulty": "easy",
    },
    {
        "text": "H2O — bu nima?",
        "correct_answer": "Suv",
        "wrong_answers": ["Vodorod", "Kislorod", "Tuz"],
        "category": "Kimyo",
        "difficulty": "easy",
    },
    {
        "text": "Dunyodagi eng uzun daryo qaysi?",
        "correct_answer": "Amazon",
        "wrong_answers": ["Nil", "Yangtze", "Mississipi"],
        "category": "Geografiya",
        "difficulty": "medium",
    },
    {
        "text": "\"O'tkan kunlar\" romanini kim yozgan?",
        "correct_answer": "Abdulla Qodiriy",
        "wrong_answers": ["Cho'lpon", "Abdulla Qahhor", "Oybek"],
        "category": "Adabiyot",
        "difficulty": "medium",
    },
    {
        "text": "Yorug'lik tezligi sekundiga taxminan necha km?",
        "correct_answer": "300000",
        "wrong_answers": ["150000", "500000", "1000000"],
        "category": "Fizika",
        "difficulty": "hard",
    },
    {
        "text": "Telegram dasturini kim yaratgan?",
        "correct_answer": "Pavel Durov",
        "wrong_answers": ["Mark Zukerberg", "Elon Musk", "Jack Dorsey"],
        "category": "Texnologiya",
        "difficulty": "medium",
    },
]


class Command(BaseCommand):
    help = "Demo uchun 10 ta o'zbek tilidagi savol qo'shadi (A/B/C/D rejimida)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Mavjud demo savollarni qaytadan yozadi (savol matni bo'yicha solishtirib)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)
        added = 0
        skipped = 0
        updated = 0

        for q in DEMO_QUESTIONS:
            existing = Question.objects.filter(text=q["text"]).first()
            if existing:
                if force:
                    existing.correct_answer = q["correct_answer"]
                    existing.wrong_answers = q["wrong_answers"]
                    existing.category = q["category"]
                    existing.difficulty = q["difficulty"]
                    existing.save()
                    updated += 1
                    self.stdout.write(self.style.WARNING(f"  ↻ yangilandi: {q['text'][:50]}"))
                else:
                    skipped += 1
                    self.stdout.write(f"  · mavjud: {q['text'][:50]}")
                continue

            Question.objects.create(
                text=q["text"],
                correct_answer=q["correct_answer"],
                wrong_answers=q["wrong_answers"],
                category=q["category"],
                difficulty=q["difficulty"],
            )
            added += 1
            self.stdout.write(self.style.SUCCESS(f"  + qo'shildi: {q['text'][:50]}"))

        total = Question.objects.count()
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Tayyor: {added} ta qo'shildi, {updated} ta yangilandi, "
                f"{skipped} ta mavjud. Jami DB'da: {total} ta savol."
            )
        )
