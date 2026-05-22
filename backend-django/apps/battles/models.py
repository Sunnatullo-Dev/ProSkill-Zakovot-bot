import uuid

from django.db import models


class BattleChallenge(models.Model):
    STATUS_CHOICES = [
        ("pending", "Kutilmoqda"),
        ("accepted", "Qabul qilindi"),
        ("in_progress", "Jarayonda"),
        ("finished", "Tugadi"),
        ("declined", "Rad etildi"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    challenger_team_id = models.UUIDField(db_index=True)
    opponent_team_id = models.UUIDField(db_index=True)
    status = models.CharField(max_length=20, default="pending", choices=STATUS_CHOICES)
    current_round_number = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "battle_challenges"


class BattleRound(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    battle = models.ForeignKey(
        BattleChallenge, on_delete=models.CASCADE, related_name="rounds"
    )
    question_id = models.UUIDField()
    round_number = models.IntegerField()
    time_limit_seconds = models.IntegerField(default=30)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "battle_rounds"


class BattleAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    battle = models.ForeignKey(
        BattleChallenge, on_delete=models.CASCADE, related_name="answers"
    )
    round = models.ForeignKey(
        BattleRound, on_delete=models.CASCADE, related_name="answers"
    )
    telegram_id = models.BigIntegerField()
    team_id = models.UUIDField()
    answer = models.TextField()
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)
    response_time_ms = models.IntegerField(default=0)

    class Meta:
        db_table = "battle_answers"
        unique_together = [("round", "telegram_id")]
