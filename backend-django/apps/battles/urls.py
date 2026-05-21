from django.urls import path

from . import views


urlpatterns = [
    path("pending", views.get_pending),
    path("challenge", views.challenge_opponent),
    path("<str:battle_id>/accept", views.accept_challenge),
    path("<str:battle_id>/decline", views.decline_challenge),
    path("<str:battle_id>/cancel", views.cancel_challenge),
    path("<str:battle_id>/answer", views.submit_answer),
    path("<str:battle_id>/state", views.get_state),
]
