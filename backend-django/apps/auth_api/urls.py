from django.urls import path

from . import mobile_views, views


urlpatterns = [
    # ─── Telegram Mini App (mavjud oqim — o'zgarmagan) ───────────────────────
    path("login", views.login),
    path("whoami", views.whoami),

    # ─── Mobil ilova (Flutter) — JWT ─────────────────────────────────────────
    path("register", mobile_views.register),
    path("login/password", mobile_views.login_with_password),
    path("token/refresh", mobile_views.refresh_token),
    path("logout", mobile_views.logout),
    path("logout/all", mobile_views.logout_all),
    path("me", mobile_views.me),
    path("password", mobile_views.change_password),
    path("link-telegram", mobile_views.link_telegram),
    path("telegram-link/create-token", mobile_views.create_telegram_link_token),
    path("telegram-link/confirm", mobile_views.confirm_telegram_link),
    path("telegram-link/status", mobile_views.telegram_link_status),
]

