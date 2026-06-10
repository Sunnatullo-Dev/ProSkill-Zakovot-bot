from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_channels),                             # GET /api/channels/
    path("check", views.check_subscriptions),                  # GET /api/channels/check
    path("check/<int:telegram_id>", views.bot_check_subscriptions),  # GET /api/channels/check/123 (bot auth)
]
