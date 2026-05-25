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
    # `find_team_by_owner` va `transfer_owner` filter qiladi — index foydali.
    owner_id = models.BigIntegerField(db_index=True)
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


class TeamChatMessage(models.Model):
    """Jamoa ichidagi chat xabarlari.

    Faqat shu jamoa a'zolari ko'radi. Raqib jamoalar ko'ra olmaydi.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="messages")
    telegram_id = models.BigIntegerField(db_index=True)  # yuborgan a'zo
    text = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "team_chat_messages"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["team", "created_at"])]
