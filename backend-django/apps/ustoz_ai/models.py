"""Ustoz AI — Fan, Dars va Savollar modellari.

Ierarxiya:
    Subject (Fan)  →  Lesson (Dars/Mavzu)  →  UstozQuestion (Savol)

Savollar har doim A/B/C/D (4 variant) ko'rinishida bo'ladi.
"""
from __future__ import annotations

from django.db import models


class Subject(models.Model):
    """Fan — Matematika, Fizika, Kimyo, Tarix, ..."""

    name = models.CharField(max_length=120, db_index=True)
    icon_emoji = models.CharField(max_length=10, blank=True, default="📚")
    description = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "ustoz_subject"
        ordering = ["order", "name"]
        verbose_name = "Fan"
        verbose_name_plural = "Fanlar"

    def __str__(self) -> str:
        return f"{self.icon_emoji} {self.name}".strip()


class Lesson(models.Model):
    """Dars/Mavzu — fan ichidagi bitta mavzu yoki o'yin sessiyasi."""

    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="lessons"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "ustoz_lesson"
        ordering = ["order", "name"]
        indexes = [
            models.Index(fields=["subject", "is_active", "order"]),
        ]
        verbose_name = "Dars"
        verbose_name_plural = "Darslar"

    def __str__(self) -> str:
        return f"{self.subject.name} — {self.name}"


CORRECT_OPTION_CHOICES = [
    ("a", "A"),
    ("b", "B"),
    ("c", "C"),
    ("d", "D"),
]


class UstozQuestion(models.Model):
    """A/B/C/D variantli test savoli.

    Faqat to'rtta variant: option_a, option_b, option_c, option_d.
    correct_option — to'g'ri javob harfi: 'a', 'b', 'c' yoki 'd'.
    """

    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="questions"
    )
    text = models.TextField(help_text="Savol matni")
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500)
    option_d = models.CharField(max_length=500)
    correct_option = models.CharField(
        max_length=1,
        choices=CORRECT_OPTION_CHOICES,
        help_text="To'g'ri javob: a, b, c yoki d",
    )
    explanation = models.TextField(
        blank=True,
        default="",
        help_text="To'g'ri javob izoh (ixtiyoriy)",
    )
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "ustoz_question"
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["lesson", "is_active", "order"]),
        ]
        verbose_name = "Ustoz AI Savol"
        verbose_name_plural = "Ustoz AI Savollar"

    def __str__(self) -> str:
        return f"[{self.lesson.name}] {self.text[:60]}"
