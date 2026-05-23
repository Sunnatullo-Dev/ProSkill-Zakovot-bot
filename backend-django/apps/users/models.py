from django.db import models


class User(models.Model):
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    score = models.IntegerField(default=0)
    unlocked_achievements = models.JSONField(default=list)
    referred_by = models.BigIntegerField(null=True, blank=True, db_index=True)
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
