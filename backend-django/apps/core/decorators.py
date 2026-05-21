"""View-decorator'lar: auth talab qilish va admin tekshiruvi."""
from __future__ import annotations

from functools import wraps

from .exceptions import AppError
from .telegram_auth import is_admin


def require_auth(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not getattr(request, "current_user", None):
            raise AppError(401, "Unauthorized")
        return view(request, *args, **kwargs)

    return wrapper


def require_admin(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = getattr(request, "current_user", None)
        if not user:
            raise AppError(401, "Unauthorized")
        if not is_admin(user.telegram_id):
            raise AppError(403, "Admin huquqi kerak")
        return view(request, *args, **kwargs)

    return wrapper
