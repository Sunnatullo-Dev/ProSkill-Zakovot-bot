from django.contrib import admin

from .models import Question, QuestionReport


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text_short", "category", "difficulty")
    list_filter = ("category", "difficulty")
    search_fields = ("text", "correct_answer")
    ordering = ("category", "text")

    def text_short(self, obj):
        return obj.text[:80]
    text_short.short_description = "Savol"


@admin.register(QuestionReport)
class QuestionReportAdmin(admin.ModelAdmin):
    list_display = ("question", "reported_by", "created_at")
    readonly_fields = ("created_at",)
