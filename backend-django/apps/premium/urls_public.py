"""Public premium URL'lari — /api/premium/*"""
from django.urls import path

from . import views

urlpatterns = [
    path("info", views.premium_info),
]
