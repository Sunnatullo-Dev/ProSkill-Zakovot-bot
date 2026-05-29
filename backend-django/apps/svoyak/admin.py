"""Django admin'da Svoyak modellarini boshqarish.

Admin paneliga kirib (`/admin/`) test ma'lumotlarni qo'lda yaratish
yoki real o'yinning state'ini ko'rish uchun.
"""
from __future__ import annotations

from django.contrib import admin

from .models import (
    SvoyakCategory,
    SvoyakPlayer,
    SvoyakQuestion,
    SvoyakRoom,
    SvoyakRoomCategorySnapshot,
    SvoyakRound,
)


@admin.register(SvoyakCategory)
class SvoyakCategoryAdmin(admin.ModelAdmin):
    list_display = ("order", "icon_emoji", "name", "language", "is_active", "question_count")
    list_display_links = ("name",)
    list_filter = ("language", "is_active")
    search_fields = ("name",)
    list_editable = ("order", "is_active")
    ordering = ("order", "name")

    def question_count(self, obj: SvoyakCategory) -> int:
        return obj.questions.count()

    question_count.short_description = "Savollar"


@admin.register(SvoyakQuestion)
class SvoyakQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "category", "value_tier", "question_type", "text_short", "is_active")
    list_display_links = ("text_short",)
    list_filter = ("category", "value_tier", "question_type", "is_active")
    search_fields = ("text", "correct_answer")
    list_editable = ("is_active",)
    autocomplete_fields = ("category",)
    fieldsets = (
        ("Asosiy", {
            "fields": ("category", "value_tier", "question_type", "is_active"),
        }),
        ("Mazmun", {
            "fields": ("text", "correct_answer", "wrong_answers", "media_url"),
        }),
        ("Meta", {
            "fields": ("created_by",),
            "classes": ("collapse",),
        }),
    )

    def text_short(self, obj: SvoyakQuestion) -> str:
        return obj.text[:80] + ("…" if len(obj.text) > 80 else "")

    text_short.short_description = "Savol"


class SvoyakPlayerInline(admin.TabularInline):
    model = SvoyakPlayer
    extra = 0
    fields = ("telegram_id", "display_name", "score", "status", "can_pick", "last_seen_at")
    readonly_fields = ("last_seen_at",)


class SvoyakRoundInline(admin.TabularInline):
    model = SvoyakRound
    extra = 0
    fields = ("id", "question", "value", "status", "buzz_winner", "answer_correct", "score_delta", "started_at")
    readonly_fields = ("id", "started_at")
    can_delete = False
    show_change_link = True


class SvoyakRoomCategorySnapshotInline(admin.TabularInline):
    model = SvoyakRoomCategorySnapshot
    extra = 0
    fields = ("order", "category", "used_value_tiers")
    autocomplete_fields = ("category",)


@admin.register(SvoyakRoom)
class SvoyakRoomAdmin(admin.ModelAdmin):
    list_display = ("code", "status", "host_telegram_id", "player_count", "round_count", "created_at")
    list_display_links = ("code",)
    list_filter = ("status",)
    search_fields = ("code", "host_telegram_id")
    readonly_fields = ("code", "created_at", "started_at", "finished_at")
    inlines = (SvoyakRoomCategorySnapshotInline, SvoyakPlayerInline, SvoyakRoundInline)

    def player_count(self, obj: SvoyakRoom) -> int:
        return obj.players.count()

    player_count.short_description = "O'yinchilar"

    def round_count(self, obj: SvoyakRoom) -> int:
        return obj.rounds.count()

    round_count.short_description = "Raundlar"


@admin.register(SvoyakPlayer)
class SvoyakPlayerAdmin(admin.ModelAdmin):
    list_display = ("display_name", "telegram_id", "room", "score", "status", "can_pick", "last_seen_at")
    list_filter = ("status", "can_pick")
    search_fields = ("display_name", "telegram_id", "room__code")
    raw_id_fields = ("room",)
    readonly_fields = ("joined_at", "last_seen_at", "last_buzz_at_ms")


@admin.register(SvoyakRound)
class SvoyakRoundAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "question", "value", "status", "buzz_winner", "answer_correct", "score_delta", "started_at")
    list_filter = ("status", "answer_correct")
    search_fields = ("room__code",)
    raw_id_fields = ("room", "question", "buzz_winner")
    readonly_fields = ("started_at", "buzz_opened_at", "ended_at", "buzz_attempts", "buzz_winner_at_ms")
