"""Django settings for Zakovat backend.

Eski Node/Express backend (backend/) bilan bir xil API qo'llab-quvvatlaydi.
Supabase REST API HTTP-client orqali, ORM ishlatilmaydi (jadvallar
Supabase tomonidan boshqariladi).
"""
from __future__ import annotations

import os
from pathlib import Path

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


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = env_bool("DJANGO_DEBUG", default=True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default="*")
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]

NODE_ENV = os.environ.get("NODE_ENV", "development").lower()
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
ADMIN_TELEGRAM_IDS: list[int] = []
for raw in env_list("ADMIN_TELEGRAM_IDS"):
    try:
        ADMIN_TELEGRAM_IDS.append(int(raw))
    except ValueError:
        continue

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
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
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
if NODE_ENV == "production":
    CORS_ALLOWED_ORIGINS = [FRONTEND_URL] if FRONTEND_URL else []
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"

# Servisi 3001 portda ishlasin (eski Node 3000 da ishlayapti).
PORT = int(os.environ.get("PORT", "3001"))

# Mini App URL — Telegram bot xabarlaridagi tugma uchun (ixtiyoriy).
MINI_APP_URL = os.environ.get("MINI_APP_URL", "")

# Ratelimit cache — `django-ratelimit` shuni ishlatadi.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "zakovat-ratelimit",
    }
}

