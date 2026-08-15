from django.urls import path

from . import views

urlpatterns = [
    # ─── Xona yaratish / ro'yxat ────────────────────────────────────────────────
    path("rooms", views.create_room),
    path("admin/rooms", views.admin_rooms),

    # ─── Holat ──────────────────────────────────────────────────────────────────
    path("rooms/<str:code>/state", views.get_state),

    # ─── Qo'shilish ─────────────────────────────────────────────────────────────
    path("rooms/<str:code>/join", views.join_player),
    path("rooms/<str:code>/spectate", views.join_spectator),

    # ─── Admin: jamoa va o'yin boshqaruvi ──────────────────────────────────────
    path("admin/rooms/<str:code>/confirm-team", views.confirm_team),
    path("admin/rooms/<str:code>/questions", views.upload_questions),
    path("admin/rooms/<str:code>/start", views.start_game),
    path("admin/rooms/<str:code>/spin", views.spin),
    path("admin/rooms/<str:code>/verify", views.admin_verify),

    # ─── O'yin davri ────────────────────────────────────────────────────────────
    path("rooms/<str:code>/advance-discussion", views.advance_discussion),
    path("rooms/<str:code>/answer", views.submit_captain_answer),
]
