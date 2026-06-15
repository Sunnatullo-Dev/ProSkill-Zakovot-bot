"""Admin xabar taxtasi — faqat adminlar ko'radi."""
from __future__ import annotations

from django.db import models


class AdminPost(models.Model):
    """Admin tomonidan e'lon qilingan xabar.

    Media (rasm/video) Telegram'da saqlanadi — faqat file_id saqlanadi.
    Ephemerli disk muammosini hal qiladi.
    """

    MEDIA_TYPE_CHOICES = [
        ("", "Yo'q"),
        ("image", "Rasm"),
        ("video", "Video"),
    ]

    author_telegram_id = models.BigIntegerField(db_index=True)
    author_name = models.CharField(max_length=200, default="")
    text = models.TextField(blank=True, default="")
    media_type = models.CharField(max_length=10, blank=True, default="", choices=MEDIA_TYPE_CHOICES)
    media_file_id = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Admin Post"
        verbose_name_plural = "Admin Posts"

    def __str__(self) -> str:
        preview = self.text[:60] if self.text else f"[{self.media_type}]"
        return f"AdminPost #{self.pk} by {self.author_telegram_id}: {preview}"
