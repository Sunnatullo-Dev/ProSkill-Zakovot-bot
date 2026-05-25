from __future__ import annotations

import logging
import os
import sys
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


NODE_ENV = os.environ.get("NODE_ENV", "development").lower()
IS_PRODUCTION = NODE_ENV == "production"

DEBUG = env_bool("DJANGO_DEBUG", default=False)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if IS_PRODUCTION:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured("DJANGO_SECRET_KEY production'da o'rnatilishi shart")
    SECRET_KEY = "dev-only-not-for-production-" + os.urandom(8).hex()

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    if IS_PRODUCTION:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured(
            "DJANGO_ALLOWED_HOSTS production'da o'rnatilishi shart "
            "(masalan: 'zakovat.onrender.com'). Bo'sh qoldirilsa Host-header attack xavfi."
        )
    # Dev-only fallback: faqat localhost. "*" ishlatilmaydi — production buzilmasin uchun.
    ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
MINI_APP_URL = os.environ.get("MINI_APP_URL", "")

# Answer-ticket'larni imzolash uchun alohida sekret — TELEGRAM_BOT_TOKEN bilan
# aralashtirib yuborilmasin (bot tokenni rotatsiya qilish ticket'larni buzmasin).
# Production'da bo'sh bo'lsa fail-fast: zaif/bo'sh kalit bilan ishlash mumkin emas.
TICKET_HMAC_SECRET = os.environ.get("TICKET_HMAC_SECRET", "")
if not TICKET_HMAC_SECRET:
    if IS_PRODUCTION:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured(
            "TICKET_HMAC_SECRET production'da o'rnatilishi shart "
            "(masalan: `python -c 'import secrets; print(secrets.token_urlsafe(48))'`)."
        )
    # Dev'da deterministik fallback — runtime'da o'zgarib turmasin uchun
    # SECRET_KEY ga bog'laymiz (har xil bo'lsa dev'da test ticket'lari mos kelmasdan ketadi).
    TICKET_HMAC_SECRET = "dev-ticket-" + SECRET_KEY

# Bot adminstrativ APIlarini chaqirish uchun alohida server-internal kalit —
# Telegram bot tokeni bilan ARALASHMASIN. Bot tokeni Telegram bilan baham
# ko'riladi va u har joyda log'larda paydo bo'lishi mumkin; admin huquqi
# uni ko'rgan har qanday clientga berilmasligi kerak.
BOT_INTERNAL_API_KEY = os.environ.get("BOT_INTERNAL_API_KEY", "")
if not BOT_INTERNAL_API_KEY and IS_PRODUCTION:
    # Production'da yo'q bo'lsa, "bot <token>" path'ini umuman o'chirib qo'yamiz.
    # Lekin ishlatilayotgan bo'lsa, alohida kalit talab qilamiz.
    pass  # middleware bu yo'qligini tekshirib path'ni rad etadi

ADMIN_TELEGRAM_IDS: list[int] = []
for raw in env_list("ADMIN_TELEGRAM_IDS"):
    # Render env qiymatlari ba'zan qo'shtirnoq bilan kiritiladi (`"123"`)
    # yoki nuqta-vergul bilan ajratilgan (`123;456`). Eng keng tarqalgan
    # typo'larni avtomatik tozalaymiz.
    cleaned = raw.strip().strip('"').strip("'").strip()
    if not cleaned:
        continue
    try:
        value = int(cleaned)
    except ValueError:
        print(
            f"[settings] WARNING: ADMIN_TELEGRAM_IDS ichida noto'g'ri qiymat: {raw!r} "
            f"(tozalangandan keyin: {cleaned!r}) — faqat raqamlar bo'lishi shart",
            file=sys.stderr,
        )
        continue
    if value <= 0:
        print(
            f"[settings] WARNING: ADMIN_TELEGRAM_IDS musbat bo'lishi shart "
            f"(qiymat rad etildi: {value})",
            file=sys.stderr,
        )
        continue
    ADMIN_TELEGRAM_IDS.append(value)

# Startup log — Render Logs'da bir qarashda ko'rinishi uchun.
# Aniq ID'larni log'ga yozmaymiz (PII), faqat son va birinchi/oxirgi raqam.
_admin_summary = (
    f"{len(ADMIN_TELEGRAM_IDS)} entries"
    if ADMIN_TELEGRAM_IDS
    else "EMPTY (Admin button will not show for anyone)"
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
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
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "apps.core.middleware.TelegramAuthMiddleware",
]

ROOT_URLCONF = "zakovat.urls"
WSGI_APPLICATION = "zakovat.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Render Disk yoki lokal SQLite
_db_path = os.environ.get("DATABASE_PATH", str(BASE_DIR / "db.sqlite3"))
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": _db_path,
        "OPTIONS": {
            "timeout": 20,
        },
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.app_exception_handler",
    "UNAUTHENTICATED_USER": None,
}

if IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS = [FRONTEND_URL] if FRONTEND_URL else []
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"

PORT = int(os.environ.get("PORT", "3000"))

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "zakovat-ratelimit",
    }
}

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
        "django.utils.autoreload": {"level": "WARNING"},
    },
}

logging.getLogger(__name__).info(
    "Zakovat backend boshlanmoqda — env=%s, debug=%s, hosts=%s, admins=%s",
    NODE_ENV,
    DEBUG,
    ALLOWED_HOSTS,
    _admin_summary,
)
