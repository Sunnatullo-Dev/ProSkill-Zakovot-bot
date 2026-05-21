"""Root URL routes — eski backend/src/app.ts dagi route'larni takrorlaydi."""
from __future__ import annotations

from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"ok": True})


def root(_request):
    return JsonResponse({"ok": True, "name": "Zakovat API (Django)"})


urlpatterns = [
    path("", root),
    path("health", health),
    path("api/auth/", include("apps.auth_api.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/questions/", include("apps.questions.urls")),
    path("api/answer/", include("apps.answers.urls")),
    path("api/game-results/", include("apps.game_results.urls")),
    path("api/teams/", include("apps.teams.urls")),
    path("api/battles/", include("apps.battles.urls")),
    path("api/admin/", include("apps.admin_api.urls")),
]
