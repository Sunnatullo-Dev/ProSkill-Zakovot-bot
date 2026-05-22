from django.contrib import admin

from .models import GameResult


@admin.register(GameResult)
class GameResultAdmin(admin.ModelAdmin):
    list_display = ("telegram_id", "correct_count", "total_count", "round_score", "created_at")
    list_filter = ("created_at",)
    readonly_fields = ("created_at",)
