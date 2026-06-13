from django.contrib import admin

from .models import GameQuestion, GameRoom, Participant, Submission


@admin.register(GameRoom)
class GameRoomAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status", "admin_telegram_id", "created_at"]
    list_filter = ["status"]
    search_fields = ["code", "name"]
    readonly_fields = ["code", "created_at"]


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ["display_name", "telegram_id", "room", "total_points", "joined_at"]
    list_filter = ["room__status"]
    search_fields = ["display_name", "telegram_id"]


@admin.register(GameQuestion)
class GameQuestionAdmin(admin.ModelAdmin):
    list_display = ["room", "order_index", "question_type", "status", "point_value", "activated_at"]
    list_filter = ["status", "question_type", "room"]
    search_fields = ["body"]


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ["participant", "question", "is_correct", "points_awarded", "graded_by", "submitted_at"]
    list_filter = ["is_correct", "graded_by"]
    search_fields = ["answer_text", "participant__display_name"]
