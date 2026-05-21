"""Eski Express `AppError` o'rnida turadigan istisno va DRF-handler."""
from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler


class AppError(Exception):
    """status_code + foydalanuvchiga ko'rinadigan xabar bilan istisno."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def app_exception_handler(exc, context):
    if isinstance(exc, AppError):
        return Response({"message": exc.message}, status=exc.status_code)

    # django-ratelimit `block=True` rejimda Ratelimited istisno qaytaradi.
    try:
        from django_ratelimit.exceptions import Ratelimited

        if isinstance(exc, Ratelimited):
            return Response(
                {"message": "Juda ko'p chaqiruv yuborildi, biroz kuting"},
                status=429,
            )
    except ImportError:
        pass

    response = drf_default_handler(exc, context)
    if response is not None and isinstance(response.data, dict) and "detail" in response.data:
        response.data = {"message": response.data["detail"]}

    return response
