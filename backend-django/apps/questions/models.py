import uuid

from django.db import models


class Question(models.Model):
    DIFFICULTY_CHOICES = [("easy", "Oson"), ("medium", "O'rtacha"), ("hard", "Qiyin")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    correct_answer = models.TextField()
    category = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    difficulty = models.CharField(
        max_length=20, null=True, blank=True, choices=DIFFICULTY_CHOICES
    )

    class Meta:
        db_table = "questions"

    def __str__(self):
        return self.text[:80]


class QuestionReport(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="reports"
    )
    reported_by = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "question_reports"
        # Bitta foydalanuvchi bitta savolni bir martadan ko'p marotaba
        # belgilab spam qila olmasin.
        unique_together = [("question", "reported_by")]
