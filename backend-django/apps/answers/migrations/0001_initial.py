from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="TtsCache",
            fields=[
                ("text_hash", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("audio_b64", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "tts_cache",
            },
        ),
    ]
