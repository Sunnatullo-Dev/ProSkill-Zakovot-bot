"""Majburiy Telegram kanallar modeli.

Ilovaga kirish uchun foydalanuvchi quyidagi kanallarga obuna bo'lishi shart.
Admin panel orqali qo'shiladi/o'chiriladi. Soft-delete (is_active=False) orqali
tarix saqlanadi — kim qachon qo'shganini ko'rish mumkin.
"""
from __future__ import annotations

from django.db import models


class RequiredChannel(models.Model):
    """Majburiy Telegram kanal — foydalanuvchi obuna bo'lishi shart."""

    # Telegram kanal identifikatori — raqamli ID yoki @username
    # Raqamli ID (masalan: -1001234567890) getChatMember uchun ishonchli.
    channel_id = models.CharField(
        max_length=100,
        help_text="Telegram kanal ID (masalan: -1001234567890 yoki @kanalname)",
    )

    # @username — foydalanuvchiga ko'rsatish va havola yasash uchun
    channel_username = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Kanal username (@ siz, masalan: mychannel)",
    )

    # Ko'rinadigan nom — foydalanuvchiga chiroyli ko'rsatiladi
    channel_title = models.CharField(
        max_length=200,
        help_text="Kanalning ko'rinadigan nomi",
    )

    # Kanal havolasi — "Obuna bo'lish" tugmasi bosganda ochiladi
    channel_url = models.CharField(
        max_length=300,
        help_text="Kanal havolasi (t.me/username yoki invite link)",
    )

    # Soft delete — o'chirilganda tarix yo'qolmaydi
    is_active = models.BooleanField(
        default=True,
        help_text="Hozirda aktiv (faol) majburiy kanal",
        db_index=True,
    )

    # Audit trail — kim qachon qo'shganini ko'rish uchun
    added_by_telegram_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Qo'shgan admin Telegram ID",
    )
    added_by_name = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Qo'shgan admin ismi",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "required_channels"
        ordering = ["-created_at"]
        verbose_name = "Majburiy kanal"
        verbose_name_plural = "Majburiy kanallar"

    def __str__(self) -> str:
        status = "✓" if self.is_active else "✗"
        return f"[{status}] {self.channel_title} ({self.channel_id})"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "channelId": self.channel_id,
            "channelUsername": self.channel_username,
            "channelTitle": self.channel_title,
            "channelUrl": self.channel_url,
            "isActive": self.is_active,
            "addedByTelegramId": self.added_by_telegram_id,
            "addedByName": self.added_by_name,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
