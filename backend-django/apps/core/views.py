from __future__ import annotations

from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def privacy_policy(request: HttpRequest) -> HttpResponse:
    """Public, self-contained Privacy Policy webpage for Zakovat App.

    Satisfies Google Play Store and international regulatory requirements:
    - Publicly accessible without authentication, cookies, or tokens.
    - Responsive, accessible HTML document specifically covering the
      Flutter mobile app, Django backend, Telegram bot, and Telegram Mini App.
    """
    response = render(
        request,
        "privacy_policy.html",
        {
            "page_title": "Privacy Policy — Zakovat App",
            "last_updated": "October 11, 2026",
            "effective_date": "October 11, 2026",
            "support_email": "support@zakovat-app.uz",
        },
    )
    # Cache publicly for 1 hour, allowing CDN/proxies to serve efficiently
    # while allowing prompt updates
    response["Cache-Control"] = "public, max-age=3600"
    response["X-Frame-Options"] = "SAMEORIGIN"
    response["X-Content-Type-Options"] = "nosniff"
    return response
