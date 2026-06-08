"""Svoyak (Своя игра) o'yini uchun ma'lumot modellari.

O'yin mantig'i:
    Boshlovchi (host) yangi `Room` yaratadi → 6-belgili kod oladi.
    Ishtirokchilar shu kod orqali `Player` sifatida qo'shilishadi.
    Host doskadan `Category × ball_value` tanlaydi → `Round` boshlanadi.
    Hamma BUZZ tugmasini kutadi. Birinchi bosgan — javob beradi.
    To'g'ri javob: +ball, noto'g'ri: -ball, javob bermasa: o'zgarmaydi.

Modellar barchada `id = BigAutoField` (settings DEFAULT_AUTO_FIELD).
UUID ishlatmaymiz — kod (room.code) URL'da, ID emas.
"""
from __future__ import annotations

from django.db import models


# ─── Kategoriya va savol bazasi (statik kontent) ─────────────────────────────

class SvoyakCategory(models.Model):
    """Mavzu — masalan "Futbol", "Dunyo poytaxtlari", "Kimyo".

    Har mavzuda aniq 5 ta savol bo'lishi spec talabi (10/20/30/40/50 bal).
    Lekin DB darajasida buni qattiq talab qilmaymiz — admin ko'proq variant
    qo'shishi mumkin, har room boshida bal qiymati uchun bittadan tasodifiy
    tanlanadi.
    """

    name = models.CharField(max_length=100, db_index=True)
    icon_emoji = models.CharField(max_length=10, blank=True, default="")
    # i18n — "uz-latn" | "uz-cyrl" | "ru". Hozircha bitta til, kelajakda
    # bir kategoriya ko'p tilda bo'lishi mumkin.
    language = models.CharField(max_length=10, default="uz-latn", db_index=True)
    # Doskada chap-o'ngga qaysi mavzu ko'rinishi tartibi.
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "svoyak_category"
        ordering = ["order", "name"]
        verbose_name = "Svoyak kategoriya"
        verbose_name_plural = "Svoyak kategoriyalar"

    def __str__(self) -> str:
        return f"{self.icon_emoji} {self.name}".strip()


VALUE_CHOICES = [
    (10, "10"),
    (20, "20"),
    (30, "30"),
    (40, "40"),
    (50, "50"),
]


QUESTION_TYPE_CHOICES = [
    ("text", "Erkin javob (matn)"),
    ("abcd", "A/B/C/D variantlar"),
]


class SvoyakQuestion(models.Model):
    """Bir savol — bitta kategoriyaga va bitta bal qiymatiga tegishli.

    Har mavzuda 5 ta turli bal bo'ladi (10/20/30/40/50). Lekin admin
    har bal uchun bir nechta variant qo'shishi mumkin — room boshida
    har baldan bittadan random tanlanadi.
    """

    category = models.ForeignKey(
        SvoyakCategory, on_delete=models.CASCADE, related_name="questions"
    )
    value_tier = models.PositiveSmallIntegerField(choices=VALUE_CHOICES, db_index=True)
    text = models.TextField()
    correct_answer = models.TextField()
    # A/B/C/D rejimi uchun 3 ta noto'g'ri variant. Bo'sh — erkin matn.
    wrong_answers = models.JSONField(default=list, blank=True)
    question_type = models.CharField(
        max_length=10, choices=QUESTION_TYPE_CHOICES, default="abcd"
    )
    # Savol uchun maxsus javob vaqti (soniya). NULL = global AppSettings'dan olinadi.
    time_seconds = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Savol uchun maxsus javob vaqti (soniya, 5-300). NULL = global sozlama."
    )
    # Kelajakda audio yoki rasm qo'shish uchun.
    media_url = models.URLField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "svoyak_question"
        indexes = [
            models.Index(fields=["category", "value_tier", "is_active"]),
        ]
        verbose_name = "Svoyak savol"
        verbose_name_plural = "Svoyak savollar"

    def __str__(self) -> str:
        return f"[{self.category.name} · {self.value_tier}] {self.text[:60]}"


# ─── Real-time o'yin holati ──────────────────────────────────────────────────

ROOM_STATUS_CHOICES = [
    ("lobby", "Lobbi (kutish)"),
    ("playing", "O'yinda"),
    ("paused", "Pauza"),
    ("finished", "Tugagan"),
]


class SvoyakRoom(models.Model):
    """Bitta o'yin sessiyasi.

    `code` — URL'da/deep link'da ishlatiladigan 6-belgili kod.
    Host (boshlovchi) — yaratuvchi, doska tanlash huquqiga ega.
    """

    code = models.CharField(max_length=6, unique=True, db_index=True)
    host_telegram_id = models.BigIntegerField(db_index=True)
    status = models.CharField(
        max_length=10, choices=ROOM_STATUS_CHOICES, default="lobby", db_index=True
    )
    # Joriy raund — kim qaysi savolga javob bermoqda. Round bittadan
    # bo'lganligi uchun FK kifoya.
    current_round = models.ForeignKey(
        "SvoyakRound",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    # O'yin sozlamalari: buzz_window_seconds, answer_seconds, max_players,
    # categories (kategoriya ID'lari ro'yxati), language va h.k. JSON
    # bo'lishi sababli kelajak migratsiyasiz qo'shimcha qo'shsa bo'ladi.
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "svoyak_room"
        ordering = ["-created_at"]
        verbose_name = "Svoyak room"
        verbose_name_plural = "Svoyak roomlar"

    def __str__(self) -> str:
        return f"Room {self.code} ({self.status})"


PLAYER_STATUS_CHOICES = [
    ("connected", "Ulangan"),
    ("disconnected", "Uzilgan"),
    ("kicked", "Chiqarib yuborilgan"),
]

PLAYER_ROLE_CHOICES = [
    ("player", "O'yinchi"),
    ("coordinator", "Koordinator (savol o'quvchi)"),
]


class SvoyakPlayer(models.Model):
    """Bitta room ichidagi bitta o'yinchi.

    `telegram_id` xona ichida noyob. Bitta foydalanuvchi bir vaqtning o'zida
    bir nechta xonada bo'lishi mumkin emas (yangi xona ochish eski'dan chiqib
    ketishni anglatadi).
    """

    room = models.ForeignKey(
        SvoyakRoom, on_delete=models.CASCADE, related_name="players"
    )
    telegram_id = models.BigIntegerField(db_index=True)
    display_name = models.CharField(max_length=120)
    avatar_url = models.URLField(blank=True, default="")
    score = models.IntegerField(default=0)  # MINUS bo'lishi mumkin
    status = models.CharField(
        max_length=15, choices=PLAYER_STATUS_CHOICES, default="connected"
    )
    # Koordinator yoki oddiy o'yinchi
    role = models.CharField(
        max_length=15, choices=PLAYER_ROLE_CHOICES, default="player"
    )
    # Buzz bossa, server ushbu vaqtni yozadi. Boshqalar BUZZ tugmasini
    # bossa, bularning vaqtidan keyin kelsa — bloked.
    last_buzz_at_ms = models.BigIntegerField(null=True, blank=True)
    # Kategoriya/ball tanlash huquqi (host'dan boshqasiga noto'g'ri javobdan
    # keyin ham berilishi mumkin — spec'da o'qiganmiz).
    can_pick = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(auto_now=True, db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "svoyak_player"
        # Bir room ichida bir foydalanuvchi faqat bir marta.
        unique_together = [("room", "telegram_id")]
        ordering = ["-score", "joined_at"]
        verbose_name = "Svoyak o'yinchi"
        verbose_name_plural = "Svoyak o'yinchilar"

    def __str__(self) -> str:
        return f"{self.display_name} ({self.score}) @ {self.room.code}"


ROUND_STATUS_CHOICES = [
    ("reading", "Savol o'qilmoqda (BUZZ rejimi yopiq)"),
    ("waiting_buzz", "BUZZ kutilmoqda (ochiq)"),
    ("answering", "Javob berilmoqda"),
    ("completed", "Tugagan"),
    ("skipped", "Hech kim javob bermadi"),
]


class SvoyakRound(models.Model):
    """Bitta raund — bitta savol bo'yicha kim qanday javob berdi.

    Buzz vaqti `buzz_winner_at_ms` (server unix ms) — chunki ms aniqligi
    kerak, datetime full precision'da emas.
    """

    room = models.ForeignKey(
        SvoyakRoom, on_delete=models.CASCADE, related_name="rounds"
    )
    question = models.ForeignKey(
        SvoyakQuestion, on_delete=models.PROTECT, related_name="+"
    )
    # Spec'da har savolning bal qiymati category × tier bilan aniqlanadi,
    # lekin denormalize qildim — raund tarixi savol bazasi o'zgargandan
    # keyin ham noto'g'ri bo'lib qolmasligi uchun.
    value = models.PositiveSmallIntegerField()
    status = models.CharField(
        max_length=15, choices=ROUND_STATUS_CHOICES, default="reading"
    )
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    buzz_opened_at = models.DateTimeField(null=True, blank=True)
    buzz_winner = models.ForeignKey(
        SvoyakPlayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    buzz_winner_at_ms = models.BigIntegerField(null=True, blank=True)
    # Buzz urinishlari log — debug uchun va kelajakda "kim 2-bo'ldi" UI uchun.
    # [{telegram_id, at_ms}, ...]
    buzz_attempts = models.JSONField(default=list, blank=True)
    answer_text = models.TextField(blank=True, default="")
    answer_correct = models.BooleanField(null=True, blank=True)
    # Score delta — bal qiymati (to'g'ri bo'lsa +value, noto'g'ri bo'lsa -value)
    score_delta = models.IntegerField(default=0)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "svoyak_round"
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["room", "status"]),
        ]
        verbose_name = "Svoyak raund"
        verbose_name_plural = "Svoyak raundlar"

    def __str__(self) -> str:
        return f"Round#{self.id} @ {self.room.code} (q={self.question_id}, val={self.value})"


class SvoyakRoomCategorySnapshot(models.Model):
    """Bir o'yinda qaysi kategoriyalar ishtirok etmoqda + qaysi ball
    qiymatlari ishlatilgan.

    Doska har room uchun alohida — har baldan qaysi savol tushgani snapshot.
    Bu spec uchun muhim: bir savol ikki marta tushmaydi.
    """

    room = models.ForeignKey(
        SvoyakRoom, on_delete=models.CASCADE, related_name="category_snapshots"
    )
    category = models.ForeignKey(SvoyakCategory, on_delete=models.PROTECT)
    # Har bal uchun aniq qaysi savol tanlangan: {"10": question_id, "20": ..., ...}
    questions_by_value = models.JSONField(default=dict)
    # Hozirgacha ishlatilgan ball'lar: [10, 30, 50]
    used_value_tiers = models.JSONField(default=list)
    # Doskadagi tartibi.
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "svoyak_room_category_snapshot"
        unique_together = [("room", "category")]
        ordering = ["order"]
        verbose_name = "Svoyak xona kategoriya snapshot"
        verbose_name_plural = "Svoyak xona kategoriya snapshotlar"

    def __str__(self) -> str:
        return f"{self.room.code} / {self.category.name} (used: {self.used_value_tiers})"
