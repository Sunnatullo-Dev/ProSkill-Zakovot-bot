from django.contrib import admin
from .models import Subject, Lesson, UstozQuestion


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ("name", "description", "order", "is_active")


class QuestionInline(admin.TabularInline):
    model = UstozQuestion
    extra = 0
    fields = ("text", "option_a", "option_b", "option_c", "option_d", "correct_option", "is_active")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("icon_emoji", "name", "order", "is_active", "created_at")
    list_editable = ("order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "order", "is_active", "created_at")
    list_editable = ("order", "is_active")
    list_filter = ("is_active", "subject")
    search_fields = ("name", "subject__name")
    inlines = [QuestionInline]


@admin.register(UstozQuestion)
class UstozQuestionAdmin(admin.ModelAdmin):
    list_display = ("text_short", "lesson", "correct_option", "is_active", "order")
    list_editable = ("correct_option", "is_active", "order")
    list_filter = ("is_active", "correct_option", "lesson__subject")
    search_fields = ("text", "lesson__name")

    def text_short(self, obj):
        return obj.text[:60]
    text_short.short_description = "Savol"
