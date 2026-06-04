from django.db import models


class DailyChallenge(models.Model):
    """Har kun uchun 5 ta savol ID'lari — barcha foydalanuvchilar uchun bir xil."""

    date = models.DateField(unique=True, db_index=True)
    question_ids = models.JSONField()  # list of 5 question UUID strings
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "daily_challenges"


class DailyChallengeEntry(models.Model):
    """Foydalanuvchi kunlik topshiriqni yakunlagani haqida yozuv."""

    telegram_id = models.BigIntegerField(db_index=True)
    date = models.DateField()
    correct_count = models.IntegerField(default=0)
    score_earned = models.IntegerField(default=0)
    streak_bonus = models.IntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "daily_challenge_entries"
        unique_together = [["telegram_id", "date"]]
        indexes = [models.Index(fields=["telegram_id", "date"])]


class UserDailyStreak(models.Model):
    """Foydalanuvchining ketma-ket kunlar (streak) statistikasi."""

    telegram_id = models.BigIntegerField(unique=True)
    current_streak = models.IntegerField(default=0)
    last_date = models.DateField(null=True, blank=True)
    longest_streak = models.IntegerField(default=0)

    class Meta:
        db_table = "user_daily_streaks"
