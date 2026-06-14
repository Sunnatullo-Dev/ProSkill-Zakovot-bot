# Zakovat

Telegram Mini App ko'rinishidagi bilim o'yini platformasi. O'zbek tilidagi Zakovat teleo'yini uslubida qurilgan.

## O'yin rejimlari

- **Yakka o'yin** — savol-javob raundlari, taymer, ball va streak tizimi
- **Kunlik chaqiriq** — har kun yangi savol to'plami
- **Jamoa rejimi** — jamoa bo'lib o'ynash
- **Duel/Bellashuv** — boshqa foydalanuvchi bilan 1v1
- **Svoyak** — doska + kategoriya × ball + BUZZ tugmasi
- **Online O'yin Xonasi** — admin xona ochadi, savollar push qiladi, real-time reyting

## Stack

| Qatlam | Texnologiya |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS + `@twa-dev/sdk` |
| Backend | Django 5 + Django REST Framework |
| Bot | grammY (TypeScript) |
| AI | Google Gemini 2.5-flash (javob baholash, TTS) |
| DB | SQLite (lokal) / PostgreSQL (prod, `DATABASE_URL`) |
| Hosting | Render (gunicorn + WhiteNoise) |

## Loyiha tuzilmasi

```
ZAKOVOT/
├── frontend/          # React + TypeScript (Telegram Mini App)
├── backend-django/    # Django 5 + DRF (asosiy backend)
├── bot/               # grammY Telegram boti
├── package.json       # monorepo workspaces
└── DEPLOY.md          # serverga qo'yish ko'rsatmasi
```

## Ishga tushirish

```bash
npm install
npm run dev   # frontend + backend-django + bot ni birga ko'taradi
```

### Environment fayllar

**`backend-django/.env`**

```env
NODE_ENV=development
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=true
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ADMIN_TELEGRAM_IDS=123456789,987654321
MINI_APP_URL=https://your-deployed-frontend-url
BOT_INTERNAL_API_KEY=your-bot-internal-key
FRONTEND_URL=http://localhost:5173
```

Django `SECRET_KEY` yaratish:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:3000
VITE_BOT_USERNAME=zakovot_robot
```

**`bot/.env`**

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BACKEND_URL=http://localhost:3000
BOT_INTERNAL_API_KEY=your-bot-internal-key
ADMIN_TELEGRAM_IDS=123456789
MINI_APP_URL=https://your-deployed-frontend-url
```

## Database

Lokal SQLite avtomatik yaratiladi (`backend-django/db.sqlite3`).

```bash
cd backend-django
python manage.py migrate
python manage.py createsuperuser  # ixtiyoriy
```

Namuna savollar qo'shish:
```bash
cd backend-django
python manage.py shell < seed.sql  # yoki to'g'ridan to'g'ri SQLite'ga import
```

## Ball tizimi

- Har to'g'ri javob: **1 ball**
- 4 soniya yoki tezroq javob: **2 ball**
- 3+ ketma-ket to'g'ri javob (streak): har savolga **+1 ball**

## Muhim fayllar

- `backend-django/zakovat/settings.py` — barcha sozlamalar
- `backend-django/apps/answers/gemini.py` — Gemini baholash logikasi
- `backend-django/apps/gamerooms/` — Online O'yin Xonasi (models, views, tests)
- `frontend/src/App.tsx` — asosiy frontend oqimi
- `bot/src/bot.ts` — asosiy bot
- `bot/src/gameroom.ts` — O'yin Xonasi bot oqimi
- `DEPLOY.md` — Render'ga qo'yish bo'yicha batafsil ko'rsatma
