from django.db import migrations
from django.core.management import call_command


def create_cache_table(apps, schema_editor):
    try:
        call_command("createcachetable")
    except Exception:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_force_svoyak_time_70"),
    ]

    operations = [
        migrations.RunPython(create_cache_table, migrations.RunPython.noop),
    ]
