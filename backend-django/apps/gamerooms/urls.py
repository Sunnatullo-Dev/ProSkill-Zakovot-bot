from django.urls import path

from . import views

urlpatterns = [
    # ─── Admin endpoint'lari ──────────────────────────────────────────────────
    # Xona yaratish (global admin kerak)
    path("admin/rooms", views.admin_create_room),
    # Xona boshqaruvi (xona admini yetarli)
    path("admin/rooms/<str:code>/start", views.admin_start_room),
    path("admin/rooms/<str:code>/finish", views.admin_finish_room),
    # Savol boshqaruvi
    path("admin/rooms/<str:code>/questions", views.admin_push_question),
    path("admin/rooms/<str:code>/questions/<int:question_id>/close", views.admin_close_question),
    path("admin/rooms/<str:code>/questions/<int:question_id>/correct-answer", views.admin_set_correct_answer),
    # Baholash
    path("admin/rooms/<str:code>/questions/<int:question_id>/auto-grade", views.admin_auto_grade),
    path("admin/rooms/<str:code>/submissions/<int:submission_id>/grade", views.admin_manual_grade),
    # Javoblar ko'rish
    path("admin/rooms/<str:code>/questions/<int:question_id>/submissions", views.admin_get_submissions),
    # Statistika va eksport
    path("admin/rooms/<str:code>/stats", views.admin_get_stats),
    path("admin/rooms/<str:code>/results", views.admin_get_results),

    # ─── Ishtirokchi endpoint'lari ────────────────────────────────────────────
    path("rooms/<str:code>/join", views.join_room),
    path("rooms/<str:code>/state", views.get_state),
    path("rooms/<str:code>/answer", views.submit_answer),
    path("rooms/<str:code>/leaderboard", views.get_leaderboard),
]
