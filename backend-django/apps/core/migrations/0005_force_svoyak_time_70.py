"""
Migration 0005: Svoyak vaqtini har doim 70 soniyaga o'rnatish.

Eski qiymatlar (15 yoki undan kam) 70 ga yangilanadi.
Bu migration prod DB'da 15s qolmagan bo'lishini kafolatlaydi.
"""
from django.db import migrations


def force_70_seconds(apps, schema_editor):
    """Svoyak_time_per_question 30 dan kichik bo'lsa 70 ga o'rnatamiz."""
    AppSettings = apps.get_model("core", "AppSettings")
    AppSettings.objects.filter(
        id=1,
        svoyak_time_per_question__lt=30,
    ).update(svoyak_time_per_question=70)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_svoyak_time_70s"),
    ]

    operations = [
        migrations.RunPython(force_70_seconds, migrations.RunPython.noop),
    ]
