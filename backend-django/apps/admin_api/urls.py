from django.urls import path
from . import views

urlpatterns = [
    path("settings", views.app_settings),
    path("stats", views.get_stats),
    path("questions", views.questions_collection),
    path("questions/bulk", views.bulk_create_questions),
    path("questions/<str:question_id>", views.question_detail),
    path("categories", views.list_categories),
    path("categories/rename", views.rename_category),
    # Users
    path("users", views.list_users),
    path("users/export", views.export_users),
    path("users/ids", views.all_telegram_ids),
    path("users/<int:telegram_id>/profile", views.user_profile),
    path("users/<int:telegram_id>/message", views.send_user_message),
    # Admins
    path("admins", views.admins_collection),
    path("admins/<int:telegram_id>", views.admin_detail),
    # Required Channels
    path("channels", views.channels_collection),
    path("channels/<int:channel_pk>", views.channel_detail),
]
