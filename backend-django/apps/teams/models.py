import uuid

from django.db import models


class Team(models.Model):
    STATUS_CHOICES = [
        ("open", "Ochiq"),
        ("in_battle", "Bellashuvda"),
        ("closed", "Yopiq"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True, db_index=True)
    owner_id = models.BigIntegerField()
    max_members = models.IntegerField(default=6)
    status = models.CharField(max_length=20, default="open", choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "teams"

    def __str__(self):
        return f"{self.name} ({self.code})"


class TeamMember(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="members")
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "team_members"
