from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="RequiredChannel",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("channel_id", models.CharField(help_text="Telegram kanal ID (masalan: -1001234567890 yoki @kanalname)", max_length=100)),
                ("channel_username", models.CharField(blank=True, default="", help_text="Kanal username (@ siz, masalan: mychannel)", max_length=100)),
                ("channel_title", models.CharField(help_text="Kanalning ko'rinadigan nomi", max_length=200)),
                ("channel_url", models.CharField(help_text="Kanal havolasi (t.me/username yoki invite link)", max_length=300)),
                ("is_active", models.BooleanField(db_index=True, default=True, help_text="Hozirda aktiv (faol) majburiy kanal")),
                ("added_by_telegram_id", models.BigIntegerField(blank=True, help_text="Qo'shgan admin Telegram ID", null=True)),
                ("added_by_name", models.CharField(blank=True, default="", help_text="Qo'shgan admin ismi", max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Majburiy kanal",
                "verbose_name_plural": "Majburiy kanallar",
                "db_table": "required_channels",
                "ordering": ["-created_at"],
            },
        ),
    ]
