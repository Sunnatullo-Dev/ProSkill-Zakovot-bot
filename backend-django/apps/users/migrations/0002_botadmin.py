from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("users", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="BotAdmin",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("telegram_id", models.BigIntegerField(db_index=True, unique=True)),
                ("first_name", models.CharField(blank=True, max_length=255, null=True)),
                ("username", models.CharField(blank=True, max_length=255, null=True)),
                ("added_by", models.BigIntegerField()),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                ("note", models.CharField(blank=True, default="", max_length=255)),
            ],
            options={"db_table": "bot_admins"},
        ),
    ]
