from django.urls import path
from . import views

urlpatterns = [
    path("", views.board_collection),
    path("<int:post_id>", views.board_detail),
    path("<int:post_id>/media", views.board_media),
]
