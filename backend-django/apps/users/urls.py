from django.urls import path

from . import views


urlpatterns = [
    path("top", views.get_top),
    path("leaderboard", views.get_leaderboard),
    path("referrals", views.get_referrals),
]
