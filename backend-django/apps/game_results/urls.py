from django.urls import path

from . import views


urlpatterns = [
    path("", views.save_result),
    path("stats", views.get_stats),
]
