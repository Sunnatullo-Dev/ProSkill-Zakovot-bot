from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_channels),          # GET /api/channels/
    path("check", views.check_subscriptions),  # GET /api/channels/check
]
