"""Public premium URL'lari — /api/premium/*"""
from django.urls import path

from . import views

urlpatterns = [
    path("info", views.premium_info),
    path("request", views.premium_request),
    path("history", views.premium_history),
]
