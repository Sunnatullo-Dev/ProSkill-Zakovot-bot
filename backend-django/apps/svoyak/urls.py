from django.urls import path

from . import admin_views, views


urlpatterns = [
    # Public catalog
    path("categories", views.list_categories),
    # Admin CRUD
    path("admin/seed", admin_views.admin_seed),
    path("admin/categories", admin_views.admin_categories),
    path("admin/categories/<int:category_id>", admin_views.admin_category_detail),
    path("admin/questions", admin_views.admin_questions),
    path("admin/questions/<int:question_id>", admin_views.admin_question_detail),
    # Room CRUD
    path("rooms", views.create_room),
    path("rooms/<str:code>/join", views.join_room),
    path("rooms/<str:code>/leave", views.leave_room),
    path("rooms/<str:code>/state", views.get_state),
    # O'yin mexanikasi
    path("rooms/<str:code>/start", views.start_game),
    path("rooms/<str:code>/pick", views.pick_question),
    path("rooms/<str:code>/open-buzz", views.open_buzz),
    path("rooms/<str:code>/buzz", views.buzz),
    path("rooms/<str:code>/answer", views.submit_answer),
    path("rooms/<str:code>/skip", views.skip_round),
    path("rooms/<str:code>/end", views.end_game),
    # Auto rejim
    path("rooms/<str:code>/auto-answer", views.auto_answer),
]
