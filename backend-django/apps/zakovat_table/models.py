"""Interaktiv Zakovat Stoli — ma'lumot modellari.

O'yin mantig'i (spec bo'yicha):
    Admin `ZtRoom` yaratadi → 4-belgili kod, botda "#ZK-XXXX" ko'rinishida
    ko'rsatiladi. Birinchi 6 kishi kod orqali `ZtPlayer` sifatida qo'shiladi —
    1-bo'lib qo'shilgan avtomatik kapitan bo'ladi (seat=1). Muxlislar
    (tomoshabinlar) `ZtSpectator` sifatida faqat kuzatadi — o'yin holatiga
    ta'sir qilmaydi.

    Admin roppa-rosa 12 ta savol yuklaydi (`ZtQuestion`, sector 1-12) →
    jamoani tasdiqlaydi (6/6) → o'yinni boshlaydi. Har raundda "ot" tasodifiy
    ishlatilmagan sektorga tushadi → 60 soniya muhokama → kapitan (matn yoki
    ovozli xabar bilan) javob beradi → admin qo'lda baholaydi: to'g'ri bo'lsa
    Jamoa +1, noto'g'ri bo'lsa Muxlislar +1. Birinchi bo'lib 6 ballga yetgan
    tomon g'olib bo'ladi.

    Bu rejim bot orqali boshqariladi — mini-app UI yo'q. Baholash Gemini bilan
    emas, admin tomonidan qo'lda amalga oshiriladi (spec talabi).

Modellar barchada `id = BigAutoField` (settings DEFAULT_AUTO_FIELD).
UUID ishlatilmaydi — kod (room.code) bot orqali ulashiladi, ID emas.
"""
from __future__ import annotations

from django.db import models


# ─── Konstantalar (repositories.py bilan bo'lishiladi) ───────────────────────

TEAM_SIZE = 6
QUESTION_COUNT = 12
WIN_SCORE = 6
DISCUSSION_SECONDS = 60

ROOM_STATUS_CHOICES = [
    ("waiting", "Jamoa yig'ilmoqda (lobbi)"),
    ("team_confirmed", "Jamoa tasdiqlangan — boshlanishi kutilmoqda"),
    ("in_progress", "O'yin jarayonda — ot aylantirilishi kutilmoqda"),
    ("discussion", "Savol o'qildi — jamoa muhokama qilmoqda"),
    ("awaiting_answer", "Kapitan yakuniy javobini kutmoqda"),
    ("verifying", "Admin javobni baholamoqda"),
    ("finished", "O'yin tugagan"),
]

WINNER_CHOICES = [
    ("team", "Jamoa (o'yinchilar)"),
    ("fans", "Muxlislar"),
    ("draw", "Durrang"),
]


class ZtRoom(models.Model):
    """Bitta 'Interaktiv Zakovat Stoli' o'yin sessiyasi.

    `code` — botda ulashiladigan noyob kod (masalan "7845", "#ZK-7845"
    ko'rinishida ko'rsatiladi).
    `admin_telegram_id` — xonani yaratgan admin; boshqaruv faqat shu kishiga.
    `current_question` — joriy raunddagi savol (ot tushgan sektor).
    `discussion_deadline` — 60 soniyalik muhokama oynasi server vaqti bilan
    tugaydi; bot shu vaqtdan keyin kapitandan yakuniy javob so'raydi.
    `captain_answer_text` / `captain_answer_is_voice` — kapitanning joriy
    raunddagi javobi (admin tasdiqlagach tozalanadi).
    """

    code = models.CharField(max_length=10, unique=True, db_index=True)
    admin_telegram_id = models.BigIntegerField(db_index=True)
    status = models.CharField(
        max_length=20, choices=ROOM_STATUS_CHOICES, default="waiting", db_index=True
    )

    team_score = models.PositiveSmallIntegerField(default=0)
    fans_score = models.PositiveSmallIntegerField(default=0)

    current_question = models.ForeignKey(
        "ZtQuestion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    discussion_deadline = models.DateTimeField(null=True, blank=True)

    captain_answer_text = models.TextField(blank=True, default="")
    captain_answer_is_voice = models.BooleanField(default=False)

    winner = models.CharField(max_length=10, choices=WINNER_CHOICES, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "zakovat_table_room"
        ordering = ["-created_at"]
        verbose_name = "Zakovat stoli xonasi"
        verbose_name_plural = "Zakovat stoli xonalari"

    def __str__(self) -> str:
        return f"ZtRoom #{self.code} ({self.status})"

    def is_room_admin(self, telegram_id: int) -> bool:
        return self.admin_telegram_id == telegram_id


class ZtPlayer(models.Model):
    """Xonaga qo'shilgan 6 o'yinchidan biri (stol atrofidagi o'rindiq).

    `seat` — 1 dan 6 gacha, qo'shilish tartibida beriladi. `seat=1` doim
    kapitan (spec: "birinchi qo'shilgan avtomatik kapitan").
    """

    room = models.ForeignKey(ZtRoom, on_delete=models.CASCADE, related_name="players")
    telegram_id = models.BigIntegerField(db_index=True)
    display_name = models.CharField(max_length=120)
    seat = models.PositiveSmallIntegerField()
    is_captain = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "zakovat_table_player"
        unique_together = [("room", "telegram_id"), ("room", "seat")]
        ordering = ["seat"]
        verbose_name = "Zakovat stoli o'yinchisi"
        verbose_name_plural = "Zakovat stoli o'yinchilari"

    def __str__(self) -> str:
        cap = " (Kapitan)" if self.is_captain else ""
        return f"[{self.seat}] {self.display_name}{cap} @ {self.room.code}"


class ZtQuestion(models.Model):
    """Admin oldindan yuklagan 12 ta savoldan biri — bitta sektorga bog'liq.

    `sector` — g'ildirak/ot to'xtaydigan raqam (1-12), yuklash tartibida
    beriladi. `used=True` bo'lsa — bu savol allaqachon o'ynalgan, qayta
    tanlanmaydi (spec talabi: savol hech qachon takrorlanmaydi).
    """

    room = models.ForeignKey(ZtRoom, on_delete=models.CASCADE, related_name="questions")
    sector = models.PositiveSmallIntegerField()
    text = models.TextField()
    answer = models.TextField()
    used = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "zakovat_table_question"
        unique_together = [("room", "sector")]
        ordering = ["sector"]
        verbose_name = "Zakovat stoli savoli"
        verbose_name_plural = "Zakovat stoli savollari"

    def __str__(self) -> str:
        return f"[{self.room.code} #{self.sector}] {self.text[:50]}"


class ZtSpectator(models.Model):
    """'O'yinni kuzatish' orqali qo'shilgan muxlis (o'qishga huquqli, holatga ta'sir qilmaydi)."""

    room = models.ForeignKey(ZtRoom, on_delete=models.CASCADE, related_name="spectators")
    telegram_id = models.BigIntegerField(db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "zakovat_table_spectator"
        unique_together = [("room", "telegram_id")]
        verbose_name = "Zakovat stoli muxlisi"
        verbose_name_plural = "Zakovat stoli muxlislari"

    def __str__(self) -> str:
        return f"Muxlis {self.telegram_id} @ {self.room.code}"
