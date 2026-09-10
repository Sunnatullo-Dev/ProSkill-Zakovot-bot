from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_premiumsettings_card_number_card_holder"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserScoreLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("telegram_id", models.BigIntegerField(db_index=True)),
                ("amount", models.IntegerField()),
                ("source", models.CharField(default="answer", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={"db_table": "user_score_log"},
        ),
        migrations.AddIndex(
            model_name="UserScoreLog",
            index=models.Index(fields=["telegram_id", "created_at"], name="score_log_tid_cat_idx"),
        ),
    ]
