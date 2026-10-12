from django.urls import path

from . import views


urlpatterns = [
    path("top", views.get_top),
    path("leaderboard", views.get_leaderboard),
    path("referrals", views.get_referrals),
    path("me", views.update_me),
    path("me/language", views.update_language),
    path("me/check-achievements", views.check_achievements),
    path("bot-start", views.bot_start),
    path("bot-phone-status", views.bot_phone_status),
    path("bot-save-phone", views.bot_save_phone),
]
