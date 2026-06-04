from __future__ import annotations

import os

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponse, JsonResponse
from django.urls import include, path, re_path


def health(_request):
    return JsonResponse({"ok": True})


def _spa_response():
    """Return React index.html if available, else a plain JSON fallback."""
    root = getattr(settings, "WHITENOISE_ROOT", None)
    if root:
        index = os.path.join(str(root), "index.html")
        if os.path.exists(index):
            return FileResponse(open(index, "rb"), content_type="text/html")
    return JsonResponse({"ok": True, "name": "Zakovat API (Django)"})


def spa_fallback(request, **_kwargs):
    """Catch-all: serve React SPA for any route not handled by API/admin."""
    return _spa_response()


urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
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
    re_path(r"^(?!api/|admin/|health$|static/).*$", spa_fallback),
]
