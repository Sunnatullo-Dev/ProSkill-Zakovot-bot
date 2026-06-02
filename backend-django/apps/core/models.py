"""Global ilova sozlamalari — yagona qator (singleton) model.

Admin panel orqali o'zgartiriladi. Har safar DB'dan o'qish o'rniga
Django's cache (locmem) orqali 60 soniya keshlanadi.
"""
from __future__ import annotations

from django.core.cache import cache
from django.db import models


SETTINGS_CACHE_KEY = "app_settings_v1"
SETTINGS_CACHE_TTL = 60  # soniya


class AppSettings(models.Model):
    """Yagona qator — id=1 doim mavjud (get_or_create orqali).

    Yangi maydon qo'shish uchun:
      1. Bu modelga maydon qo'shing
      2. Migration yarating
      3. Admin API views.py'da get/update mantiqini yangilang
      4. Frontend types va UI'ni yangilang
    """

    # ── Battle chat ──────────────────────────────────────────────────────────
    battle_chat_enabled = models.BooleanField(
        default=True,
        help_text="Battle o'yinida jamoa chat ko'rinsinmi"
    )
    battle_chat_poll_interval_ms = models.PositiveIntegerField(
        default=4000,
        help_text="Chat yangilanish intervali (millisoniya, 1000-30000)"
    )

    # ── To'g'ri javobni ko'rsatish ───────────────────────────────────────────
    battle_show_correct_on_timeout = models.BooleanField(
        default=True,
        help_text="Vaqt tugaganda to'g'ri javobni ko'rsatsinmi"
    )

    # ── TTS (ovoz) ──────────────────────────────────────────────────────────
    tts_enabled = models.BooleanField(
        default=True,
        help_text="TTS (ovozli o'qish) funksiyasi global yoqilganmi"
    )
    tts_default_muted = models.BooleanField(
        default=False,
        help_text="Yangi foydalanuvchilar uchun ovoz default o'chirilganmi"
    )

    # ── Qiyinlik darajalari ─────────────────────────────────────────────────
    difficulty_easy_enabled = models.BooleanField(
        default=True,
        help_text="'Oson' qiyinlik darajasi o'yinda ko'rinsinmi"
    )
    difficulty_medium_enabled = models.BooleanField(
        default=True,
        help_text="'O'rtacha' qiyinlik darajasi o'yinda ko'rinsinmi"
    )
    difficulty_hard_enabled = models.BooleanField(
        default=True,
        help_text="'Qiyin' qiyinlik darajasi o'yinda ko'rinsinmi"
    )

    # ── Koordinator rejimi ──────────────────────────────────────────────────
    svoyak_coordinator_enabled = models.BooleanField(
        default=True,
        help_text="Svoyak'da koordinator roliga qo'shilish mumkinmi"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "app_settings"
        verbose_name = "Ilova sozlamalari"

    def __str__(self) -> str:
        return "Global sozlamalar"

    @classmethod
    def get(cls) -> "AppSettings":
        """Keshdan yoki DB'dan singleton sozlamalarni qaytaradi."""
        cached = cache.get(SETTINGS_CACHE_KEY)
        if cached is not None:
            return cached
        obj, _ = cls.objects.get_or_create(id=1)
        cache.set(SETTINGS_CACHE_KEY, obj, SETTINGS_CACHE_TTL)
        return obj

    @classmethod
    def invalidate_cache(cls) -> None:
        cache.delete(SETTINGS_CACHE_KEY)

    def to_dict(self) -> dict:
        return {
            "battleChatEnabled": self.battle_chat_enabled,
            "battleChatPollIntervalMs": self.battle_chat_poll_interval_ms,
            "battleShowCorrectOnTimeout": self.battle_show_correct_on_timeout,
            "ttsEnabled": self.tts_enabled,
            "ttsDefaultMuted": self.tts_default_muted,
            "difficultyEasyEnabled": self.difficulty_easy_enabled,
            "difficultyMediumEnabled": self.difficulty_medium_enabled,
            "difficultyHardEnabled": self.difficulty_hard_enabled,
            "svoyakCoordinatorEnabled": self.svoyak_coordinator_enabled,
        }
