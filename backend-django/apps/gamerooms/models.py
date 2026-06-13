"""Online O'yin Xonasi — ma'lumot modellari.

O'yin mantig'i:
    Admin `GameRoom` yaratadi → 6-belgili kod + ixtiyoriy parol.
    Ishtirokchilar kod orqali `Participant` sifatida qo'shilishadi.
    Admin savollarni bir-bir `GameQuestion` sifatida push qiladi → status active.
    Har bir ishtirokchi `Submission` yuboradi yoki tahrirlaydi (deadline'gacha).
    Admin avto yoki qo'lda baholaydi → leaderboard yangilanadi.
    Admin `finished` qiladi → yakuniy reyting + top-3.

Modellar barchada `id = BigAutoField` (settings DEFAULT_AUTO_FIELD).
UUID ishlatilmaydi — kod (room.code) URL'da, ID emas.
"""
from __future__ import annotations

from django.db import models


# ─── Xona ────────────────────────────────────────────────────────────────────

ROOM_STATUS_CHOICES = [
    ("waiting", "Kutish (lobby)"),
    ("active", "O'yin jarayonda"),
    ("finished", "Tugagan"),
]

POINT_VALUE_CHOICES = [
    (1, "1 ball"),
    (2, "2 ball"),
    (3, "3 ball"),
]

TIME_LIMIT_CHOICES = [
    (30, "30 soniya"),
    (60, "60 soniya"),
    (90, "90 soniya"),
    (120, "120 soniya (default)"),
    (180, "180 soniya"),
]

QUESTION_TYPE_CHOICES = [
    ("text", "Erkin matn"),
    ("audio", "Audio"),
    ("image", "Rasm"),
]

QUESTION_STATUS_CHOICES = [
    ("pending", "Kutilmoqda"),
    ("active", "Aktiv (ochiq)"),
    ("closed", "Yopilgan"),
]


class GameRoom(models.Model):
    """Bitta online o'yin sessiyasi.

    `code` — URL'da/deep link'da ishlatiladigan 6-belgili noyob kod.
    `join_password` — ixtiyoriy: bo'sh bo'lsa erkin kirish.
    `admin_telegram_id` — yaratuvchi; u doimiy "uy egasi".
    `extra_admin_ids` — qo'shimcha adminlar (JSON list of int).
    """

    code = models.CharField(max_length=6, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    admin_telegram_id = models.BigIntegerField(db_index=True)
    # Qo'shimcha admin'lar — [{telegram_id: int, name: str}, ...]
    extra_admin_ids = models.JSONField(default=list, blank=True)
    # Ixtiyoriy parol — bo'sh bo'lsa erkin kirish
    join_password = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=10, choices=ROOM_STATUS_CHOICES, default="waiting", db_index=True
    )
    # Faol savol — FK nullable (o'yin boshlanmagan yoki savol yo'q)
    current_question = models.ForeignKey(
        "GameQuestion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "gameroom_room"
        ordering = ["-created_at"]
        verbose_name = "O'yin xonasi"
        verbose_name_plural = "O'yin xonalari"

    def __str__(self) -> str:
        return f"GameRoom {self.code} — {self.name} ({self.status})"

    def is_room_admin(self, telegram_id: int) -> bool:
        """Berilgan foydalanuvchi bu xonaning admini ekanligini tekshiradi."""
        if self.admin_telegram_id == telegram_id:
            return True
        extra = self.extra_admin_ids if isinstance(self.extra_admin_ids, list) else []
        return any(
            (item.get("telegram_id") if isinstance(item, dict) else item) == telegram_id
            for item in extra
        )


# ─── Ishtirokchi ─────────────────────────────────────────────────────────────

class Participant(models.Model):
    """Xonaga qo'shilgan ishtirokchi.

    `telegram_id` xona ichida noyob. `display_name` — xona doirasida taxallus.
    `total_points` — jamg'arilgan ball (denormalize, baholash vaqtida yangilanadi).
    """

    room = models.ForeignKey(
        GameRoom, on_delete=models.CASCADE, related_name="participants"
    )
    telegram_id = models.BigIntegerField(db_index=True)
    display_name = models.CharField(max_length=120)
    total_points = models.IntegerField(default=0)
    # Tez javob berish tiebreaker uchun: birinchi to'g'ri javob vaqtlari yig'indisi (ms).
    # Kichik bo'lsa — tezroq demak. Leaderboard'da ballar teng bo'lsa shu bo'yicha saralanadi.
    speed_score_ms = models.BigIntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gameroom_participant"
        unique_together = [("room", "telegram_id")]
        ordering = ["-total_points", "speed_score_ms", "joined_at"]
        verbose_name = "Ishtirokchi"
        verbose_name_plural = "Ishtirokchilar"

    def __str__(self) -> str:
        return f"{self.display_name} ({self.total_points}pt) @ {self.room.code}"


# ─── Savol ──────────────────────────────────────────────────────────────────

class GameQuestion(models.Model):
    """Admin push qilgan bitta savol.

    `activated_at` — admin 'active' qilgan vaqt (server-authoritative).
    `deadline` = activated_at + time_limit_seconds. Backend enforce qiladi.
    `correct_answer` — null bo'lishi mumkin (admin keyin to'ldiradi).
    `media_ref` — Telegram file_id yoki URL; backend transcode qilmaydi.
    `order_index` — xonadagi tartib (push qilish tartibida oshadi).
    `is_bonus` — bonus savol belgisi (qo'shimcha ball uchun multiplier yo'q,
                  faqat uch tur: point_value=1/2/3).
    `is_quick` — tez savol (30s preset) belgisi.
    """

    room = models.ForeignKey(
        GameRoom, on_delete=models.CASCADE, related_name="questions"
    )
    question_type = models.CharField(
        max_length=10, choices=QUESTION_TYPE_CHOICES, default="text"
    )
    body = models.TextField(help_text="Savol matni")
    # Media uchun: Telegram file_id yoki to'liq URL — backend saqlaydi, ko'rsatmaydi
    media_ref = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Telegram file_id yoki URL (audio/image uchun)",
    )
    # Izoh (rasm ostida yoki audio ustida)
    caption = models.CharField(max_length=500, blank=True, default="")
    # To'g'ri javob — avto baholash uchun (qo'lda baholashda null bo'lishi mumkin)
    correct_answer = models.TextField(blank=True, default="")
    time_limit_seconds = models.PositiveSmallIntegerField(
        choices=TIME_LIMIT_CHOICES,
        default=120,
        help_text="Javob vaqti (30/60/90/120/180 soniya)",
    )
    point_value = models.PositiveSmallIntegerField(
        choices=POINT_VALUE_CHOICES,
        default=1,
        help_text="To'g'ri javob uchun ball (1/2/3)",
    )
    order_index = models.PositiveIntegerField(
        default=0, db_index=True, help_text="Push tartibidagi raqam"
    )
    status = models.CharField(
        max_length=10, choices=QUESTION_STATUS_CHOICES, default="pending", db_index=True
    )
    # Bonus va quick bayroqlar — filter/UI uchun
    is_bonus = models.BooleanField(default=False)
    is_quick = models.BooleanField(default=False)

    activated_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Admin 'active' qilgan server vaqti",
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    # Umumiy savol bankiga saqlash uchun (ixtiyoriy)
    bank_question_id = models.BigIntegerField(
        null=True, blank=True, db_index=True,
        help_text="apps.questions modelidagi savolning ID'si (saqlangan bo'lsa)",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gameroom_question"
        ordering = ["order_index", "created_at"]
        indexes = [
            models.Index(fields=["room", "status"]),
            models.Index(fields=["room", "order_index"]),
        ]
        verbose_name = "O'yin savoli"
        verbose_name_plural = "O'yin savollari"

    def __str__(self) -> str:
        return f"[{self.room.code} #{self.order_index}] {self.body[:60]}"


# ─── Javob (Submission) ──────────────────────────────────────────────────────

class Submission(models.Model):
    """Ishtirokchining bitta savolga javobi.

    UPSERT logikasi: (question, participant) kombinatsiyasi noyob.
    Deadline'gacha tahrirlash mumkin — `updated_at` tracker.
    `is_correct` null = hali baholanmagan.
    `points_awarded` null = hali baholanmagan, 0 = noto'g'ri/baholangan.
    `graded_by` = "auto" | "manual" | null.
    """

    question = models.ForeignKey(
        GameQuestion, on_delete=models.CASCADE, related_name="submissions"
    )
    participant = models.ForeignKey(
        Participant, on_delete=models.CASCADE, related_name="submissions"
    )
    answer_text = models.TextField()
    is_correct = models.BooleanField(null=True, blank=True)
    points_awarded = models.PositiveSmallIntegerField(null=True, blank=True)
    graded_by = models.CharField(
        max_length=10,
        blank=True,
        default="",
        help_text="'auto' yoki 'manual' — null bo'lsa hali baholanmagan",
    )
    # Auto baholashda Gemini tushuntirishi
    grading_note = models.CharField(max_length=300, blank=True, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gameroom_submission"
        unique_together = [("question", "participant")]
        indexes = [
            models.Index(fields=["question", "participant"]),
            models.Index(fields=["question", "is_correct"]),
        ]
        verbose_name = "Javob"
        verbose_name_plural = "Javoblar"

    def __str__(self) -> str:
        status = (
            "to'g'ri" if self.is_correct is True
            else "noto'g'ri" if self.is_correct is False
            else "baholanmagan"
        )
        return f"{self.participant.display_name} → Q#{self.question_id} [{status}]"
