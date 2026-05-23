from django.contrib import admin

from .models import BotAdmin, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("telegram_id", "first_name", "username", "score", "created_at")
    search_fields = ("telegram_id", "first_name", "username")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-score",)


@admin.register(BotAdmin)
class BotAdminAdmin(admin.ModelAdmin):
    list_display = ("telegram_id", "first_name", "username", "added_by", "note", "added_at")
    search_fields = ("telegram_id", "first_name", "username")
    readonly_fields = ("added_at",)
