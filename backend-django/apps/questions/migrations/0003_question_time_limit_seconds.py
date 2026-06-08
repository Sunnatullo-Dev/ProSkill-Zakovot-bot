"""Migration 0003: Question modeliga time_limit_seconds maydoni qo'shish.

NULL = standart vaqt (15 soniya).
Qiymat belgilansa faqat shu savol uchun alohida vaqt ishlatiladi.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0002_question_wrong_answers_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="time_limit_seconds",
            field=models.PositiveSmallIntegerField(
                null=True,
                blank=True,
                help_text="Savol uchun vaqt limiti (soniya, 5-120). NULL = standart (15s).",
            ),
        ),
    ]
