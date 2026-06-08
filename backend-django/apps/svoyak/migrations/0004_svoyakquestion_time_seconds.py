"""
Migration 0004: SvoyakQuestion'ga time_seconds maydoni qo'shish.

NULL = global AppSettings.svoyak_time_per_question ishlatiladi.
Qiymat belgilansa, faqat shu savol uchun alohida vaqt.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("svoyak", "0003_add_player_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="svoyakquestion",
            name="time_seconds",
            field=models.PositiveSmallIntegerField(
                null=True,
                blank=True,
                help_text="Savol uchun maxsus javob vaqti (soniya, 5-300). NULL = global sozlama.",
            ),
        ),
    ]
