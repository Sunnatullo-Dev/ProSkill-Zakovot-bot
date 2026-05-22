from django.contrib import admin

from .models import Team, TeamMember


class TeamMemberInline(admin.TabularInline):
    model = TeamMember
    extra = 0
    readonly_fields = ("joined_at",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "owner_id", "status", "max_members", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "code")
    inlines = [TeamMemberInline]
