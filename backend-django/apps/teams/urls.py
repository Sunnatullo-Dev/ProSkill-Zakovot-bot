from django.urls import path

from . import views


urlpatterns = [
    path("", views.create_team),
    path("join", views.join_team),
    path("my", views.get_my_team),
    path("my/rename", views.rename_my_team),
    path("my/transfer-owner", views.transfer_team_owner),
    path("my/chat", views.get_team_chat),
    path("my/chat/send", views.post_team_chat),
    path("leave", views.leave_team),
]
