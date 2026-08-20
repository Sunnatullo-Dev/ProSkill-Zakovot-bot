from django.urls import path
from . import views

# Public
urlpatterns = [
    path("subjects/", views.list_subjects, name="ustoz-subjects"),
    path("subjects/<int:subject_id>/lessons/", views.list_lessons, name="ustoz-lessons"),
    path("lessons/<int:lesson_id>/questions/", views.list_questions, name="ustoz-questions"),
    path("questions/<int:question_id>/check/", views.check_answer, name="ustoz-check"),
]

# Admin (api/admin/ustoz/ prefix bilan chaqiriladi — zakovat/urls.py'da)
admin_urlpatterns = [
    path("subjects/", views.admin_subjects, name="ustoz-admin-subjects"),
    path("subjects/<int:pk>/", views.admin_subject_detail, name="ustoz-admin-subject-detail"),
    path("lessons/", views.admin_lessons, name="ustoz-admin-lessons"),
    path("lessons/<int:pk>/", views.admin_lesson_detail, name="ustoz-admin-lesson-detail"),
    path("questions/", views.admin_questions, name="ustoz-admin-questions"),
    path("questions/<int:pk>/", views.admin_question_detail, name="ustoz-admin-question-detail"),
]
