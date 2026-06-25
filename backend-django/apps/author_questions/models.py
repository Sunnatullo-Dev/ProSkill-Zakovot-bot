"""Muallif savollari — foydalanuvchilar tomonidan yuborilgan savollar.

Hayot sikli:
  PENDING  — foydalanuvchi savol yubordi, admin ko'rib chiqmagan.
  APPROVED — admin tasdiqladi (savol "Mualliflik savollari" pooliga kiradi).
  REJECTED — admin rad etdi (ixtiyoriy sabab bilan).

MUHIM: Tasdiqlangan savollar hech qachon asosiy Question jadvaliga
qo'shilmaydi — ular faqat shu jadvalda saqlanadi (alohida pool).
"""
from __future__ import annotations

from django.db import models


class AuthorQuestion(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Kutilmoqda"),
        (STATUS_APPROVED, "Tasdiqlandi"),
        (STATUS_REJECTED, "Rad etildi"),
    ]

    # Yuboruvchi
    telegram_id = models.BigIntegerField(db_index=True)
    # Muallif o'zi yozgan ism (F.I.O)
    author_name = models.CharField(max_length=255)

    # Savol va javob
    question_text = models.TextField()
    answer = models.TextField()

    # Holat
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Ko'rib chiqish
    reviewed_by_telegram_id = models.BigIntegerField(null=True, blank=True)
    reviewed_by_name = models.CharField(max_length=255, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "author_questions"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["telegram_id", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"AuthorQuestion #{self.pk} [{self.status}] from {self.telegram_id}"

    def to_dict(self) -> dict:
        return {
            "id": self.pk,
            "telegramId": self.telegram_id,
            "authorName": self.author_name,
            "questionText": self.question_text,
            "answer": self.answer,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "reviewedByTelegramId": self.reviewed_by_telegram_id,
            "reviewedByName": self.reviewed_by_name,
            "reviewedAt": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "rejectReason": self.reject_reason,
        }
