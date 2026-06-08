"""
Migration: Svoyak vaqt standartini 15 → 30 soniyaga o'zgartirish.

Model field default o'zgartiriladi va mavjud singleton qator ham yangilanadi.
"""
from django.db import migrations, models


def update_existing_time(apps, schema_editor):
    """Mavjud AppSettings qatorida vaqtni 30 ga yangilaymiz.

    Faqat 15 (eski default) bo'lsa yangilaymiz — agar admin allaqachon
    o'zgartirgan bo'lsa, uning qiymatini saqlashimiz kerak.
    """
    AppSettings = apps.get_model("core", "AppSettings")
    AppSettings.objects.filter(id=1, svoyak_time_per_question=15).update(
        svoyak_time_per_question=30
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_svoyak_time_per_question"),
    ]

    operations = [
        # 1. Model field defaultini 30 ga o'zgartirish
        migrations.AlterField(
            model_name="appsettings",
            name="svoyak_time_per_question",
            field=models.PositiveIntegerField(
                default=30,
                help_text="Svoyak'da har savol uchun vaqt (soniya, 5-60)",
            ),
        ),
        # 2. Mavjud singleton qatorni yangilash (faqat eski 15 bo'lsa)
        migrations.RunPython(update_existing_time, migrations.RunPython.noop),
    ]
