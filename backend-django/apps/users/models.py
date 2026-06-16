from django.db import models


class User(models.Model):
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    # Leaderboard `score DESC` saralash uchun index — har leaderboard chaqiruvi
    # `get_user_rank` ham `score__gt` filter qiladi.
    score = models.IntegerField(default=0, db_index=True)
    unlocked_achievements = models.JSONField(default=list)
    referred_by = models.BigIntegerField(null=True, blank=True, db_index=True)
    # UI tili: 'uz-latn', 'uz-cyrl', 'ru'. Frontend localStorage'ga ham
    # yozadi (offline'da ishlashi uchun), ammo qurilmalararo sinxron uchun
    # ushbu maydon manba haqiqat hisoblanadi.
    language = models.CharField(max_length=10, default="uz-latn")
    current_streak = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.first_name or self.username or 'User'} ({self.telegram_id})"


class BotAdmin(models.Model):
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    added_by = models.BigIntegerField()
    added_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "bot_admins"

    def __str__(self):
        return f"{self.first_name or self.username or 'Admin'} ({self.telegram_id})"


class MilestoneState(models.Model):
    """Singleton qator — id=1 doim mavjud.

    Qaysi foydalanuvchi milestoneigacha tabrik yuborilganligi saqlanadi.
    Deployment qayta ishga tushganda ham DB'da saqlanadi, shuning uchun
    bir xil milestone ikki marta hech qachon yuborilmaydi.
    """

    last_celebrated_user_milestone = models.PositiveIntegerField(
        default=0,
        help_text="Oxirgi tabrik yuborilgan foydalanuvchilar soni (100 ga karrali)",
    )

    class Meta:
        db_table = "milestone_state"

    def __str__(self) -> str:
        return f"Milestone: {self.last_celebrated_user_milestone}"
