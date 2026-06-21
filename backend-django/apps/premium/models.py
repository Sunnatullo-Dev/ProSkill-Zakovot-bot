"""Premium to'lov so'rovlari modeli."""
from __future__ import annotations

from django.db import models


class PremiumRequest(models.Model):
    """Foydalanuvchi to'lov cheki yuklagan so'rovlar.

    Hayot sikli:
      PENDING  — foydalanuvchi chek yukladi, admin ko'rib chiqmagan.
      APPROVED — admin tasdiqladi, foydalanuvchiga premium berildi.
      REJECTED — admin rad etdi (ixtiyoriy sabab bilan).
    """

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Kutilmoqda"),
        (STATUS_APPROVED, "Tasdiqlandi"),
        (STATUS_REJECTED, "Rad etildi"),
    ]

    # So'rov egasi
    telegram_id = models.BigIntegerField(db_index=True)
    display_name = models.CharField(max_length=255, blank=True, default="")
    username = models.CharField(max_length=255, null=True, blank=True)

    # Holat
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    # Chek (Telegram'da saqlanadi)
    receipt_file_id = models.CharField(max_length=255)
    receipt_media_type = models.CharField(max_length=20, default="image")

    # Narx snapshot (so'rov yuborilgan paytdagi)
    amount = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=20, default="so'm")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Admin tomonidan ko'rib chiqilganda
    reviewed_by_telegram_id = models.BigIntegerField(null=True, blank=True)
    reviewed_by_name = models.CharField(max_length=255, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Rad etish sababi
    reject_reason = models.TextField(blank=True, default="")

    # Tasdiqlangan muddatning oxiri (approve paytida o'rnatiladi)
    granted_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "premium_requests"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["telegram_id", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PremiumRequest #{self.pk} [{self.status}] from {self.telegram_id}"

    def to_dict(self) -> dict:
        return {
            "id": self.pk,
            "telegramId": self.telegram_id,
            "displayName": self.display_name,
            "username": self.username,
            "status": self.status,
            "amount": self.amount,
            "currency": self.currency,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "reviewedByTelegramId": self.reviewed_by_telegram_id,
            "reviewedByName": self.reviewed_by_name,
            "reviewedAt": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "rejectReason": self.reject_reason,
            "grantedUntil": self.granted_until.isoformat() if self.granted_until else None,
            # Media proxy URL'ni view qo'shadi (ID kerak bo'lgani uchun to'g'ridan-to'g'ri)
            "receiptUrl": f"/api/admin/premium/requests/{self.pk}/receipt",
        }
