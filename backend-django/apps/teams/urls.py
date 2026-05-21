from django.urls import path

from . import views


urlpatterns = [
    path("", views.create_team),
    path("join", views.join_team),
    path("my", views.get_my_team),
    path("leave", views.leave_team),
]
