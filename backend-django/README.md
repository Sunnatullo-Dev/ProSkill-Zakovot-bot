# Zakovat Django backend

Eski Node/Express backend (`../backend/`) ning Python/Django muqobili.
Hozircha **Faza 1** tayyor: auth, foydalanuvchi, savol va o'yin natijasi endpointlari.

Frontend hech qanday o'zgartirilmaydi — bu backend bir xil API kontraktni
saqlaydi (`/api/auth/login`, `/api/users/*`, `/api/questions/*`, `/api/game-results/*`).

## Ishga tushirish (ilk marta)

```bash
cd backend-django

# 1. Virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 2. Bog'lanmalarni o'rnatish
pip install -r requirements.txt

# 3. .env tayyorlash (eski backend/.env qiymatlarini ko'chiring)
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

# 4. Server (port 3001 — eski Node 3000 da turaveradi)
python manage.py runserver 3001
```

## Migratsiya rejasi

| Faza | Holat | Qaysi endpointlar |
|-----:|------:|---|
| 1 | ✅ tayyor | `/api/auth/login`, `/api/users/{top,leaderboard,referrals}`, `/api/questions/*`, `/api/game-results/*` |
| 2 | ✅ tayyor | `/api/answer/{ticket,,reveal}` (HMAC ticket, Gemini grading + lokal fallback) |
| 3 | kutilmoqda | `/api/teams/*`, `/api/battles/*` (race-condition'lardan himoyalangan) |
| 4 | kutilmoqda | `/api/admin/*`, frontend port switch, eski Node backend o'chirilishi |

## Arxitektura

```
apps/
  core/         # Supabase client, Telegram auth, middleware, exception handler
  auth_api/     # /api/auth/login
  users/        # /api/users/*
  questions/    # /api/questions/*
  answers/      # /api/answer/* (ticket, submit, reveal) + scoring + gemini
  game_results/ # /api/game-results/*
zakovat/        # Django project (settings, urls, wsgi)
```

- **Supabase ORM ishlatilmaydi** — eski Node backend kabi service-role kalit bilan
  REST API orqali murojaat qiladi. Bu jadval skemasini saqlab qoladi va frontend
  uchun o'zgarish bo'lmaydi.
- **Telegram auth**: HMAC-SHA256 bilan initData ni tekshiriladi
  (`apps/core/telegram_auth.py`). "guest" initData mehmon foydalanuvchini qaytaradi.
- **Middleware**: har bir so'rovga `request.current_user` (yoki None) qo'shadi.
- **Decorators**: `@require_auth`, `@require_admin` view'larda ishlatiladi.

## Deploy

Render / Railway: `Procfile` orqali avtomatik aniqlanadi.

```
web: gunicorn zakovat.wsgi:application --bind 0.0.0.0:$PORT
```
