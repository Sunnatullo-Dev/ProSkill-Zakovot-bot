from django.contrib import admin

from .models import ZtPlayer, ZtQuestion, ZtRoom, ZtSpectator


@admin.register(ZtRoom)
class ZtRoomAdmin(admin.ModelAdmin):
    list_display = ["code", "status", "admin_telegram_id", "team_score", "fans_score", "winner", "created_at"]
    list_filter = ["status", "winner"]
    search_fields = ["code"]
    readonly_fields = ["code", "created_at"]


@admin.register(ZtPlayer)
class ZtPlayerAdmin(admin.ModelAdmin):
    list_display = ["seat", "display_name", "telegram_id", "is_captain", "room", "joined_at"]
    list_filter = ["is_captain", "room__status"]
    search_fields = ["display_name", "telegram_id"]


@admin.register(ZtQuestion)
class ZtQuestionAdmin(admin.ModelAdmin):
    list_display = ["room", "sector", "used", "created_at"]
    list_filter = ["used", "room"]
    search_fields = ["text", "answer"]


@admin.register(ZtSpectator)
class ZtSpectatorAdmin(admin.ModelAdmin):
    list_display = ["room", "telegram_id", "joined_at"]
    search_fields = ["telegram_id"]
