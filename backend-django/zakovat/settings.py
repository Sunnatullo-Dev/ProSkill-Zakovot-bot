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
        # Production'da yo'q bo'lsa crash qilmaymiz — server qaytib
        # ko'tarila olmaydi va admin paneli umuman ochilmaydi.
        # O'rniga `os.urandom`'dan derived hosil qilamiz. Process restart
        # qilinsa o'zgaradi — session/CSRF buziladi, lekin ish davom etadi.
        SECRET_KEY = "auto-" + os.urandom(32).hex()
        print(
            "[settings] WARNING: DJANGO_SECRET_KEY o'rnatilmagan — "
            "tasodifiy auto-generated key ishlatildi. Bu restart paytida o'zgaradi "
            "(session/CSRF buziladi). Render env'ga aniq qiymat qo'ying.",
            file=sys.stderr,
        )
    else:
        SECRET_KEY = "dev-only-not-for-production-" + os.urandom(8).hex()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
MINI_APP_URL = os.environ.get("MINI_APP_URL", "")

# DJANGO_ALLOWED_HOSTS — bo'sh bo'lsa FRONTEND_URL'dan derive qilamiz +
# Render hostname pattern. Backend xavfsiz default'lar bilan ishlaydi
# (crash qilmaydi), warning log yoziladi.
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    derived: list[str] = ["localhost", "127.0.0.1"]
    if FRONTEND_URL:
        from urllib.parse import urlparse
        try:
            fh = urlparse(FRONTEND_URL).hostname
            if fh:
                derived.append(fh)
        except Exception:  # noqa: BLE001
            pass
    if IS_PRODUCTION:
        # Render hostname'lari `*.onrender.com` (custom domain o'rnatilmagan bo'lsa).
        derived.append(".onrender.com")  # leading dot — subdomain wildcard
        print(
            f"[settings] WARNING: DJANGO_ALLOWED_HOSTS o'rnatilmagan. "
            f"Auto-derived: {derived}. Xavfsizlik uchun aniq domain'larni "
            f"qo'ying (masalan: 'zakovat-backend.onrender.com').",
            file=sys.stderr,
        )
    ALLOWED_HOSTS = derived

# Answer-ticket'larni imzolash uchun sekret.
# Production'da o'rnatilmagan bo'lsa SECRET_KEY'dan derived hash ishlatamiz.
# Bu xavfsizlik nuqtai nazaridan SECRET_KEY bilan bir xil darajada —
# ikkalasi ham backend'da saqlanadi. Crash qilish o'rniga ishlay olamiz.
TICKET_HMAC_SECRET = os.environ.get("TICKET_HMAC_SECRET", "")
if not TICKET_HMAC_SECRET:
    import hashlib as _hashlib
    TICKET_HMAC_SECRET = "ticket-" + _hashlib.sha256(
        f"zakovat-tickets-v1::{SECRET_KEY}".encode("utf-8")
    ).hexdigest()
    if IS_PRODUCTION:
        print(
            "[settings] WARNING: TICKET_HMAC_SECRET o'rnatilmagan — SECRET_KEY'dan "
            "derived qilindi. Xavfsizroq: alohida tasodifiy kalit qo'ying "
            "(`python -c \"import secrets; print(secrets.token_urlsafe(48))\"`).",
            file=sys.stderr,
        )

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
    "apps.svoyak",
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
    # CORS allowed origins — FRONTEND_URL'dan boshlaymiz. Telegram WebView
    # ham yetib kelishi mumkin (mini-app o'z domain'idan AJAX qiladi).
    # CORS_ALLOWED_ORIGIN_REGEXES bilan Vercel/Netlify subdomain'larini ham
    # qabul qilamiz — bu CORS_ALLOWED_ORIGINS o'rniga regex bilan moslashuvchan.
    _cors_origins: list[str] = []
    if FRONTEND_URL:
        _cors_origins.append(FRONTEND_URL)
    CORS_ALLOWED_ORIGINS = _cors_origins
    CORS_ALLOWED_ORIGIN_REGEXES = [
        # Vercel deployment'lari (Preview va Production) — multi-subdomain ham
        r"^https://[\w-]+(\.[\w-]+)*\.vercel\.app$",
        # Netlify deployment'lari — multi-subdomain ham
        r"^https://[\w-]+(\.[\w-]+)*\.netlify\.app$",
        # Render frontend (statik sayt) — multi-subdomain ham
        r"^https://[\w-]+(\.[\w-]+)*\.onrender\.com$",
        # GitHub Pages
        r"^https://[\w-]+\.github\.io$",
        # Cloudflare Pages
        r"^https://[\w-]+\.pages\.dev$",
        # Telegram'ning WebView ba'zan `null` origin yuboradi (ba'zi qurilmalar)
        # — bu uchun corsheaders allow_null_origin yo'q, lekin allow_all
        # qoldirilsa xavfsizlik buziladi. Buning o'rniga frontend tomondan
        # initData HMAC tekshirish himoya bo'ladi.
    ]
    CORS_ALLOW_CREDENTIALS = True
    # X-Dev-Tid headerni dev test uchun ruxsat etamiz (production'da middleware
    # IS_PRODUCTION bo'lsa bypass o'tkazib yuboradi — xavfsiz).
    from corsheaders.defaults import default_headers
    CORS_ALLOW_HEADERS = list(default_headers) + ["x-dev-tid"]
    if not _cors_origins:
        print(
            "[settings] WARNING: FRONTEND_URL o'rnatilmagan. Faqat Vercel/"
            "Netlify/Render subdomain'larining CORS regex'lari qabul qilinadi.",
            file=sys.stderr,
        )
else:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# React frontend build output served from root URL by WhiteNoise.
# Build command copies frontend/dist/ here during deploy.
WHITENOISE_ROOT = BASE_DIR.parent / "frontend" / "dist"
WHITENOISE_INDEX_FILE = "index.html"

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
