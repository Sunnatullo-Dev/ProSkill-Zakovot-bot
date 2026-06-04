from django.urls import path

from . import views

urlpatterns = [
    path("today", views.get_today),
    path("complete", views.complete),
]
