from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="DailyChallenge",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("date", models.DateField(db_index=True, unique=True)),
                ("question_ids", models.JSONField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "daily_challenges"},
        ),
        migrations.CreateModel(
            name="DailyChallengeEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("telegram_id", models.BigIntegerField(db_index=True)),
                ("date", models.DateField()),
                ("correct_count", models.IntegerField(default=0)),
                ("score_earned", models.IntegerField(default=0)),
                ("streak_bonus", models.IntegerField(default=0)),
                ("completed_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "daily_challenge_entries"},
        ),
        migrations.AddConstraint(
            model_name="dailychallengeentry",
            constraint=models.UniqueConstraint(
                fields=["telegram_id", "date"], name="unique_daily_entry_per_user"
            ),
        ),
        migrations.AddIndex(
            model_name="dailychallengeentry",
            index=models.Index(fields=["telegram_id", "date"], name="daily_entry_user_date_idx"),
        ),
        migrations.CreateModel(
            name="UserDailyStreak",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("telegram_id", models.BigIntegerField(unique=True)),
                ("current_streak", models.IntegerField(default=0)),
                ("last_date", models.DateField(blank=True, null=True)),
                ("longest_streak", models.IntegerField(default=0)),
            ],
            options={"db_table": "user_daily_streaks"},
        ),
    ]
