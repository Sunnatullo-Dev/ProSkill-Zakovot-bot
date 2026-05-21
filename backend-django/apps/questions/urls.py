from django.urls import path

from . import views


urlpatterns = [
    path("round", views.get_round),
    path("categories", views.get_categories),
    path("reported", views.get_reported_questions),
    path("<str:question_id>/report", views.report_question),
    path("<str:question_id>", views.delete_question),
]
