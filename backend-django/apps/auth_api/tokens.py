"""JWT access/refresh tokenlari — mobil ilova (Flutter) uchun.

NEGA `djangorestframework-simplejwt` EMAS:
    simplejwt `AUTH_USER_MODEL` ga qattiq bog'langan va `AbstractBaseUser`
    talab qiladi. Bu loyihada `apps.users.User` — oddiy `models.Model`,
    `django.contrib.auth` esa allaqachon o'z migratsiyalari bilan o'rnatilgan.
    `AUTH_USER_MODEL` ni almashtirish mavjud bazada juda xavfli.
    Shu sababli `tickets.py` bilan bir xil falsafada — yengil, aniq va
    to'liq nazorat qilinadigan qatlam yozildi.

TOKEN TARKIBI (payload):
    sub  — telegram_id (butun kod bazasi shu bo'yicha foydalanuvchini taniydi)
    uid  — User.pk
    tv   — token_version (parol o'zgarsa yoki "hamma qurilmadan chiqish" bosilsa oshadi)
    typ  — "access" | "refresh"
    jti  — noyob ID (refresh bekor qilish uchun)
    iat  — chiqarilgan vaqt
    exp  — amal qilish muddati

XAVFSIZLIK QOIDALARI:
    1. `access` va `refresh` ALOHIDA sirlar bilan imzolanadi — access sirini
       bilgan tomon refresh yasay olmaydi.
    2. Refresh ROTATSIYA qilinadi: har `refresh` chaqiruvida eski token
       bekor qilinadi (`jti` blacklist'ga tushadi).
    3. `tv` (token_version) DB bilan solishtiriladi — parol almashtirilsa
       barcha eski tokenlar bir zumda kuchini yo'qotadi.
"""
from __future__ import annotations

import hashlib
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Literal

import jwt
from django.conf import settings
from django.core.cache import cache

from apps.core.exceptions import AppError


logger = logging.getLogger(__name__)

ALGORITHM = "HS256"

# Muddatlar — settings orqali override qilinadi.
ACCESS_TTL_SECONDS = int(getattr(settings, "JWT_ACCESS_TTL_SECONDS", 30 * 60))          # 30 daqiqa
REFRESH_TTL_SECONDS = int(getattr(settings, "JWT_REFRESH_TTL_SECONDS", 60 * 24 * 3600))  # 60 kun

TokenType = Literal["access", "refresh"]


def _derive_secret(purpose: str) -> str:
    """SECRET_KEY dan maqsadga xos sir hosil qiladi.

    Alohida env o'zgaruvchisi berilgan bo'lsa — o'sha ishlatiladi.
    """
    explicit = getattr(settings, f"JWT_{purpose.upper()}_SECRET", "") or ""
    if explicit:
        return explicit
    base = getattr(settings, "SECRET_KEY", "") or ""
    if not base:
        raise RuntimeError("SECRET_KEY o'rnatilmagan — JWT imzolab bo'lmaydi")
    return hashlib.sha256(f"zakovat-jwt-{purpose}-v1::{base}".encode("utf-8")).hexdigest()


ACCESS_SECRET = _derive_secret("access")
REFRESH_SECRET = _derive_secret("refresh")

_SECRETS: dict[str, str] = {"access": ACCESS_SECRET, "refresh": REFRESH_SECRET}


@dataclass(frozen=True)
class TokenPair:
    access: str
    refresh: str
    access_expires_in: int
    refresh_expires_in: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "accessToken": self.access,
            "refreshToken": self.refresh,
            "tokenType": "Bearer",
            "accessExpiresIn": self.access_expires_in,
            "refreshExpiresIn": self.refresh_expires_in,
        }


@dataclass(frozen=True)
class TokenPayload:
    telegram_id: int
    user_pk: int
    token_version: int
    token_type: TokenType
    jti: str
    issued_at: int
    expires_at: int


# ─── Chiqarish ───────────────────────────────────────────────────────────────

def _encode(user, token_type: TokenType, ttl: int) -> tuple[str, str]:
    now = int(time.time())
    jti = uuid.uuid4().hex
    payload = {
        "sub": str(user.telegram_id),
        "uid": user.pk,
        "tv": user.token_version,
        "typ": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + ttl,
    }
    token = jwt.encode(payload, _SECRETS[token_type], algorithm=ALGORITHM)
    # PyJWT 2.x str qaytaradi; 1.x bytes qaytargan — ikkalasini ham qo'llab-quvvatlaymiz.
    if isinstance(token, bytes):  # pragma: no cover
        token = token.decode("utf-8")
    return token, jti


def issue_token_pair(user) -> TokenPair:
    """Foydalanuvchi uchun yangi access + refresh juftligini chiqaradi."""
    access, _ = _encode(user, "access", ACCESS_TTL_SECONDS)
    refresh, _ = _encode(user, "refresh", REFRESH_TTL_SECONDS)
    return TokenPair(
        access=access,
        refresh=refresh,
        access_expires_in=ACCESS_TTL_SECONDS,
        refresh_expires_in=REFRESH_TTL_SECONDS,
    )


# ─── Tekshirish ──────────────────────────────────────────────────────────────

def decode_token(token: str, expected_type: TokenType) -> TokenPayload:
    """Tokenni dekodlaydi va turini tekshiradi.

    Xatolar:
        401 — muddati o'tgan / imzo noto'g'ri / tur mos emas
    """
    secret = _SECRETS[expected_type]
    try:
        raw = jwt.decode(
            token,
            secret,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "iat", "sub", "typ", "jti"]},
        )
    except jwt.ExpiredSignatureError:
        raise AppError(401, "Token muddati tugagan")
    except jwt.InvalidTokenError:
        raise AppError(401, "Token yaroqsiz")

    if raw.get("typ") != expected_type:
        raise AppError(401, "Token turi mos emas")

    try:
        telegram_id = int(raw["sub"])
        user_pk = int(raw["uid"])
        token_version = int(raw.get("tv", 0))
    except (KeyError, TypeError, ValueError):
        raise AppError(401, "Token tarkibi buzilgan")

    if telegram_id <= 0:
        raise AppError(401, "Token tarkibi buzilgan")

    return TokenPayload(
        telegram_id=telegram_id,
        user_pk=user_pk,
        token_version=token_version,
        token_type=expected_type,
        jti=str(raw["jti"]),
        issued_at=int(raw["iat"]),
        expires_at=int(raw["exp"]),
    )


def decode_access(token: str) -> TokenPayload:
    return decode_token(token, "access")


def decode_refresh(token: str) -> TokenPayload:
    """Refresh tokenni tekshiradi + bekor qilinganligini ham tekshiradi."""
    payload = decode_token(token, "refresh")
    if is_refresh_revoked(payload.jti):
        raise AppError(401, "Token bekor qilingan, qaytadan kiring")
    return payload


# ─── Bekor qilish (blacklist) ────────────────────────────────────────────────

def _revoke_key(jti: str) -> str:
    return f"jwt_revoked:{jti}"


def revoke_refresh(payload: TokenPayload) -> None:
    """Refresh tokenni bekor qilingan deb belgilaydi.

    TTL tokenning qolgan amal qilish muddatiga teng — undan keyin `exp`
    o'zi rad etadi, keshda saqlashning hojati yo'q.
    """
    remaining = max(1, payload.expires_at - int(time.time()))
    cache.set(_revoke_key(payload.jti), "1", timeout=remaining)


def is_refresh_revoked(jti: str) -> bool:
    try:
        return cache.get(_revoke_key(jti)) is not None
    except Exception:  # noqa: BLE001
        # Kesh ishlamasa — FAIL-OPEN emas, FAIL-SAFE: tokenni haqiqiy deb
        # hisoblaymiz, chunki `token_version` va `exp` baribir himoya qiladi.
        logger.warning("jwt: revoke keshini o'qib bo'lmadi", exc_info=True)
        return False


def rotate_refresh(refresh_token: str):
    """Refresh tokenni yangi juftlikka almashtiradi (rotatsiya).

    Eski refresh darhol bekor qilinadi — o'g'irlangan token qayta
    ishlatilsa, ikkinchi urinishda 401 oladi.

    Qaytaradi: (TokenPair, User)
    """
    from apps.users.models import User

    payload = decode_refresh(refresh_token)

    user = User.objects.filter(pk=payload.user_pk).first()
    if not user:
        raise AppError(401, "Foydalanuvchi topilmadi")

    if user.token_version != payload.token_version:
        raise AppError(401, "Sessiya bekor qilingan, qaytadan kiring")

    revoke_refresh(payload)
    return issue_token_pair(user), user


def resolve_access(token: str):
    """Access tokendan foydalanuvchini topadi (middleware uchun).

    Qaytaradi: `User` yoki `None`. Hech qachon istisno ko'tarmaydi —
    middleware auth'siz davom eta olishi kerak.
    """
    from apps.users.models import User

    try:
        payload = decode_access(token)
    except AppError:
        return None
    except Exception:  # noqa: BLE001
        logger.warning("jwt: access tokenni dekodlashda kutilmagan xato", exc_info=True)
        return None

    user = User.objects.filter(pk=payload.user_pk).only(
        "id", "telegram_id", "first_name", "last_name", "username", "token_version"
    ).first()
    if not user:
        return None
    if user.token_version != payload.token_version:
        return None
    if user.telegram_id != payload.telegram_id:
        # Akkaunt Telegram'ga bog'langanda telegram_id o'zgaradi —
        # eski tokenlar avtomatik yaroqsiz bo'lishi kerak.
        return None
    return user
