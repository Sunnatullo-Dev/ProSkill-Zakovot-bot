from django.urls import path

from . import views


urlpatterns = [
    path("ticket", views.issue_ticket),
    path("tts", views.tts),
    path("reveal", views.reveal_answer),
    path("", views.submit_answer),
]
