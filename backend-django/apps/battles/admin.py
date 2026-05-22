from django.contrib import admin

from .models import BattleAnswer, BattleChallenge, BattleRound


class BattleRoundInline(admin.TabularInline):
    model = BattleRound
    extra = 0
    readonly_fields = ("started_at", "ended_at")


@admin.register(BattleChallenge)
class BattleChallengeAdmin(admin.ModelAdmin):
    list_display = (
        "id", "status", "current_round_number", "created_at", "started_at", "finished_at"
    )
    list_filter = ("status",)
    readonly_fields = ("created_at", "started_at", "finished_at")
    inlines = [BattleRoundInline]
