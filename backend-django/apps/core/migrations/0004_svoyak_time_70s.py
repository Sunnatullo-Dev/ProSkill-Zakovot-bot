"""
Migration: Svoyak vaqtini 70 soniyaga (1:10) o'zgartirish.

Model field default: 30 → 70
Validatsiya oralig'i: 5-60 → 5-120 (admin view'da)
Mavjud singleton qator: 30 bo'lsa → 70 ga yangilaymiz.
"""
from django.db import migrations, models


def set_70_seconds(apps, schema_editor):
    """Agar hali default qiymat (30) bo'lsa, 70 ga yangilaymiz."""
    AppSettings = apps.get_model("core", "AppSettings")
    # 15 yoki 30 (eski default'lar) bo'lsa yangilaymiz — admin o'zgartirgan bo'lsa saqlaymiz
    AppSettings.objects.filter(id=1, svoyak_time_per_question__in=[15, 30]).update(
        svoyak_time_per_question=70
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_svoyak_time_default_30"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appsettings",
            name="svoyak_time_per_question",
            field=models.PositiveIntegerField(
                default=70,
                help_text="Svoyak'da har savol uchun vaqt (soniya, 5-120)",
            ),
        ),
        migrations.RunPython(set_70_seconds, migrations.RunPython.noop),
    ]
