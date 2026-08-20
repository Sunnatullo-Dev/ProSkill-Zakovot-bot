"""Ustoz AI admin URL patterns — /api/admin/ustoz/ prefix bilan."""
from django.urls import path
from . import views

urlpatterns = [
    path("subjects/", views.admin_subjects, name="ustoz-admin-subjects"),
    path("subjects/<int:pk>/", views.admin_subject_detail, name="ustoz-admin-subject-detail"),
    path("lessons/", views.admin_lessons, name="ustoz-admin-lessons"),
    path("lessons/<int:pk>/", views.admin_lesson_detail, name="ustoz-admin-lesson-detail"),
    path("questions/", views.admin_questions, name="ustoz-admin-questions"),
    path("questions/<int:pk>/", views.admin_question_detail, name="ustoz-admin-question-detail"),
]
