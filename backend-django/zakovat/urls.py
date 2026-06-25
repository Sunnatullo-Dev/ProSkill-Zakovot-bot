from __future__ import annotations

import os

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponse, JsonResponse
from django.urls import include, path, re_path

_admin_path = getattr(settings, "ADMIN_SECRET_PATH", "admin").strip("/")


def health(_request):
    return JsonResponse({"ok": True})


def _spa_response():
    """Return React index.html if available, else a plain JSON fallback."""
    root = getattr(settings, "WHITENOISE_ROOT", None)
    if root:
        index = os.path.join(str(root), "index.html")
        if os.path.exists(index):
            resp = FileResponse(open(index, "rb"), content_type="text/html")
            # index.html HECH QACHON keshlanmasin — Telegram/brauzer doim eng
            # so'nggi versiyani olsin. (Ichidagi hashlangan JS/CSS abadiy
            # keshlansa ham, index.html ularning YANGI nomlariga ishora qiladi.)
            # Aks holda foydalanuvchi eski versiyani ko'rib qoladi.
            resp["Cache-Control"] = "no-cache, no-store, must-revalidate"
            resp["Pragma"] = "no-cache"
            resp["Expires"] = "0"
            return resp
    return JsonResponse({"ok": True, "name": "Zakovat API (Django)"})


def spa_fallback(request, **_kwargs):
    """Catch-all: serve React SPA for any route not handled by API/admin."""
    return _spa_response()


urlpatterns = [
    path("health", health),
    path(f"{_admin_path}/", admin.site.urls),
    path("api/auth/", include("apps.auth_api.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/questions/", include("apps.questions.urls")),
    re_path(r"^api/answer(?:/|$)", include("apps.answers.urls")),
    re_path(r"^api/game-results(?:/|$)", include("apps.game_results.urls")),
    re_path(r"^api/teams(?:/|$)", include("apps.teams.urls")),
    path("api/battles/", include("apps.battles.urls")),
    path("api/admin/", include("apps.admin_api.urls")),
    path("api/svoyak/", include("apps.svoyak.urls")),
    path("api/daily/", include("apps.daily.urls")),
    path("api/channels/", include("apps.channels.urls")),
    path("api/gamerooms/", include("apps.gamerooms.urls")),
    path("api/admin/board/", include("apps.admin_board.urls")),
    path("api/premium/", include("apps.premium.urls_public")),
    path("api/", include("apps.author_questions.urls_public")),  # POST /api/author-questions
    re_path(
        rf"^(?!api/|{_admin_path}/|health$|static/).*$",
        spa_fallback,
    ),
]
