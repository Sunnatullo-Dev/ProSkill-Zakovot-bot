"""Django settings for Zakovat backend.

Eski Node/Express backend (backend/) bilan bir xil API qo'llab-quvvatlaydi.
Supabase REST API HTTP-client orqali, ORM ishlatilmaydi (jadvallar
Supabase tomonidan boshqariladi).
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# Production rejimda DEBUG va SECRET_KEY default qiymatlarsiz bo'lishi shart.
NODE_ENV = os.environ.get("NODE_ENV", "development").lower()
IS_PRODUCTION = NODE_ENV == "production"

# DEBUG default = False — production xavfsizligi uchun.
DEBUG = env_bool("DJANGO_DEBUG", default=False)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY production'da o'rnatilishi shart")
    SECRET_KEY = "dev-only-not-for-production-" + os.urandom(8).hex()

# ALLOWED_HOSTS — production'da aniq ro'yxat majburiy.
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    if IS_PRODUCTION:
        raise ImproperlyConfigured(
            "DJANGO_ALLOWED_HOSTS production'da o'rnatilishi shart (masalan: api.example.com,example.com)"
        )
    # Faqat dev/test rejimda — har qanday host ruxsat etiladi.
    ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
MINI_APP_URL = os.environ.get("MINI_APP_URL", "")

# Production'da kerakli env'larni tekshiramiz — startup'da fail-fast.
if IS_PRODUCTION:
    _required = {
        "TELEGRAM_BOT_TOKEN": TELEGRAM_BOT_TOKEN,
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
        "FRONTEND_URL": FRONTEND_URL,
    }
    _missing = [name for name, value in _required.items() if not value]
    if _missing:
        raise ImproperlyConfigured(
            f"Production'da quyidagi env'lar yo'q: {', '.join(_missing)}"
        )

ADMIN_TELEGRAM_IDS: list[int] = []
_invalid_admin_ids: list[str] = []
for raw in env_list("ADMIN_TELEGRAM_IDS"):
    try:
        ADMIN_TELEGRAM_IDS.append(int(raw))
    except ValueError:
        _invalid_admin_ids.append(raw)
if _invalid_admin_ids:
    print(
        f"[settings] WARNING: ADMIN_TELEGRAM_IDS ichida noto'g'ri qiymatlar e'tibordan chetda qoldi: "
        f"{_invalid_admin_ids}",
        file=sys.stderr,
    )

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.core",
    "apps.auth_api",
    "apps.users",
    "apps.questions",
    "apps.answers",
    "apps.game_results",
    "apps.teams",
    "apps.battles",
    "apps.admin_api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # WhiteNoise admin static fayllarini production'da xizmat ko'rsatadi.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
    "apps.core.middleware.TelegramAuthMiddleware",
]

ROOT_URLCONF = "zakovat.urls"
WSGI_APPLICATION = "zakovat.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

# Django ORM ishlatmaymiz — Supabase REST orqali jadvallarga murojaat qilamiz.
# Lekin Django o'zining boshqaruv buyruqlari uchun bir DB e'lon qilishni talab qiladi,
# shu sababli faqat in-memory SQLite ulayapmiz.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# REST Framework — eski Express-loyihasi default JSON javoblar va Bearer-style auth bilan ishlagan.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.app_exception_handler",
    "UNAUTHENTICATED_USER": None,
}

# CORS — dev rejimda barcha kelib chiqishlardan, prod da faqat FRONTEND_URL.
if IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS = [FRONTEND_URL] if FRONTEND_URL else []
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True

# Static fayllar — Django admin va boshqa static resurslar uchun.
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"

# Default port 3000 — eski Node backend egallagan port'ni almashtiramiz.
# Frontend `VITE_API_URL` o'zgartirilishi shart emas.
PORT = int(os.environ.get("PORT", "3000"))

# Production-ready logging. `print()` o'rniga `logger.info/warning/error` ishlating.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO" if IS_PRODUCTION else "DEBUG",
    },
    "loggers": {
        # Django'ning shovqinli access loglarini uchirib turamiz.
        "django.utils.autoreload": {"level": "WARNING"},
    },
}

# Ratelimit cache — `django-ratelimit` shuni ishlatadi.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "zakovat-ratelimit",
    }
}

logging.getLogger(__name__).info(
    "Zakovat backend boshlanmoqda — env=%s, debug=%s, hosts=%s",
    NODE_ENV,
    DEBUG,
    ALLOWED_HOSTS,
)
