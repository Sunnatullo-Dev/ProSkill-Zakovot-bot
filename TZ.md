# ZAKOVAT — TEXNIK TOPSHIRIQ (TZ)

> **Hujjat turi:** Mavjud tizimning to'liq texnik tavsifi (reverse-engineered specification)
> **Loyiha:** Zakovat — Telegram Mini App ko'rinishidagi bilim o'yini platformasi
> **Repozitoriya:** `https://github.com/Orinbayev/ZakovatApp.git`
> **Hujjat versiyasi:** 1.0
> **Tuzilgan sana:** 2026-09-07
> **Manba:** `main` branch, commit `892c9ec` ("feat: Reyting — Umumiy / Shu oygi period filtri qo'shildi")
> **Til:** O'zbek (lotin)

---

## MUNDARIJA

| № | Bo'lim |
|---|---|
| 1 | [Hujjat haqida](#1-hujjat-haqida) |
| 2 | [Loyiha umumiy tavsifi](#2-loyiha-umumiy-tavsifi) |
| 3 | [Texnologiya steki](#3-texnologiya-steki) |
| 4 | [Repozitoriya tuzilmasi](#4-repozitoriya-tuzilmasi) |
| 5 | [Tizim arxitekturasi](#5-tizim-arxitekturasi) |
| 6 | [Autentifikatsiya va avtorizatsiya](#6-autentifikatsiya-va-avtorizatsiya) |
| 7 | [Ma'lumotlar bazasi modeli](#7-malumotlar-bazasi-modeli) |
| 8 | [Funksional talablar — o'yin rejimlari](#8-funksional-talablar--oyin-rejimlari) |
| 9 | [Ball va baholash tizimi](#9-ball-va-baholash-tizimi) |
| 10 | [AI (Google Gemini) integratsiyasi](#10-ai-google-gemini-integratsiyasi) |
| 11 | [REST API — to'liq ro'yxat](#11-rest-api--toliq-royxat) |
| 12 | [Telegram bot](#12-telegram-bot) |
| 13 | [Frontend (Mini App)](#13-frontend-mini-app) |
| 14 | [Admin panel](#14-admin-panel) |
| 15 | [Xavfsizlik talablari](#15-xavfsizlik-talablari) |
| 16 | [Rate limit va anti-cheat](#16-rate-limit-va-anti-cheat) |
| 17 | [Konfiguratsiya (environment)](#17-konfiguratsiya-environment) |
| 18 | [Deploy va infratuzilma](#18-deploy-va-infratuzilma) |
| 19 | [Testlar](#19-testlar) |
| 20 | [Ma'lum kamchiliklar va texnik qarz](#20-malum-kamchiliklar-va-texnik-qarz) |
| 21 | [Terminlar lug'ati](#21-terminlar-lugati) |

---

## 1. HUJJAT HAQIDA

### 1.1 Maqsad

Ushbu hujjat **mavjud Zakovat platformasining haqiqiy holatini** kod darajasida aniq tavsiflaydi. Bu:

- **yangi dasturchi** uchun tizimga kirish qo'llanmasi;
- **texnik topshiriq** — tizimni qaytadan qurish yoki kengaytirish uchun asos;
- **audit** hujjati — qaysi qoidalar qayerda amalga oshirilganini ko'rsatadi.

### 1.2 Hujjatning muhim tamoyili

Bu hujjatdagi **har bir raqam, chegara va qoida haqiqiy koddan olingan**. Agar kodda `README.md` yoki `DEPLOY.md` bilan qarama-qarshilik bo'lsa — **kod haqiqat manbai** hisoblanadi va bunday farqlar [20-bo'limda](#20-malum-kamchiliklar-va-texnik-qarz) alohida qayd etilgan.

### 1.3 Belgilar

| Belgi | Ma'nosi |
|---|---|
| `fayl.py:123` | Fayl va qator raqami |
| **MAJBURIY** | Talab bajarilishi shart |
| **⚠️** | Xavfsizlikka oid muhim qoida |
| **🐞** | Kodda mavjud nomuvofiqlik / ehtimoliy bug |

---

## 2. LOYIHA UMUMIY TAVSIFI

### 2.1 Mahsulot nima?

**Zakovat** — o'zbek tilidagi "Zakovat" teleo'yini uslubida qurilgan **bilim o'yini platformasi**. Foydalanuvchi Telegram ilovasidan chiqmasdan o'ynaydi (Telegram Mini App). Platforma **9 xil o'yin rejimi**, obuna (premium) tizimi, admin paneli va Telegram bot boshqaruvidan iborat.

### 2.2 Foydalanuvchi rollari

| Rol | Kim | Qanday aniqlanadi |
|---|---|---|
| **Mehmon** (guest) | `telegram_id = 0` | Faqat dev rejimda (`ALLOW_GUEST_AUTH=true`). Ko'p amallar taqiqlangan |
| **Foydalanuvchi** | Telegram orqali kirgan har kim | `initData` HMAC tekshiruvidan o'tgan |
| **Premium foydalanuvchi** | `users.premium_until > now()` | Kunlik limitlardan ozod |
| **Bot-admin** | `bot_admins` jadvalidagi yozuv | Super-admin tomonidan qo'shiladi |
| **Super-admin** | `ADMIN_TELEGRAM_IDS` env ro'yxatida | Faqat env orqali; admin qo'sha/o'chira oladi |
| **Xona admini** | O'yin xonasini yaratgan kishi + `extra_admin_ids` | Faqat o'z xonasi doirasida |
| **Host** (Svoyak) | Svoyak xonasini yaratgan kishi | Faqat o'z xonasi doirasida |
| **Koordinator** (Svoyak) | Xonaga `role=coordinator` bilan kirgan | Savol o'qiydi, ball olmaydi, BUZZ bosolmaydi |
| **Kapitan** (Zakovat Stoli) | Xonaga 1-bo'lib kirgan (`seat=1`) | Yakuniy javobni faqat u beradi |

### 2.3 O'yin rejimlari (qisqacha)

| № | Rejim | Qayerda o'ynaladi | Ishtirokchilar | Baholash |
|---|---|---|---|---|
| 1 | **Yakka o'yin** (raund) | Mini App | 1 | AI yoki A/B/C/D |
| 2 | **Kunlik topshiriq** | Mini App | 1 | AI yoki A/B/C/D |
| 3 | **Jamoa** | Mini App | 2–6 | — (chat + tashkiliy) |
| 4 | **Bellashuv** (Battle) | Mini App | 2 jamoa (faqat sardorlar javob beradi) | AI yoki A/B/C/D |
| 5 | **Svoyak — klassik doska** | Mini App | 2+ | A/B/C/D yoki AI |
| 6 | **Svoyak — auto** | Mini App | 1+ | AI |
| 7 | **Online O'yin Xonasi** | Mini App + Bot | Cheklanmagan | Admin (avto/qo'lda) |
| 8 | **Interaktiv Zakovat Stoli** | Bot (mini-app'da faqat kuzatish) | 6 o'yinchi + muxlislar | Admin qo'lda |
| 9 | **Ustoz AI** | Mini App | 1 | A/B/C/D (server) |

### 2.4 Yordamchi tizimlar

- **Premium obuna** — chek yuklash → admin tasdiqlash → muddat berish
- **Majburiy kanal obunasi** — ilovaga kirishdan oldin kanalga obuna bo'lish sharti
- **Muallif savollari** — foydalanuvchi savol yuboradi, admin moderatsiya qiladi
- **Reyting** — umumiy va oylik; taklif (referal) reytingi
- **Yutuqlar (achievements)** — 5 ta yutuq, bonus ball bilan
- **Admin xabar taxtasi** — faqat adminlar ko'radigan ichki e'lonlar
- **Ko'p tillilik** — uz-latn / uz-cyrl / ru

---

## 3. TEXNOLOGIYA STEKI

### 3.1 Qatlamlar

| Qatlam | Texnologiya | Aniq versiya |
|---|---|---|
| Frontend | React | 19.2.6 |
| | TypeScript | 6.0.3 |
| | Vite | 8.0.12 |
| | Tailwind CSS | 3.4.19 |
| | PostCSS / autoprefixer | 8.5.14 / 10.5.0 |
| | `pdfjs-dist` (PDF import) | ^4.10.38 |
| | `xlsx` (Excel import) | 0.18.5 |
| Backend | Django | 5.0.6 |
| | Django REST Framework | 3.15.2 |
| | django-cors-headers | 4.4.0 |
| | django-ratelimit | 4.1.0 |
| | python-dotenv | 1.0.1 |
| | requests | 2.32.3 |
| | google-generativeai | 0.8.3 |
| | gunicorn | 22.0.0 |
| | whitenoise | 6.7.0 |
| | dj-database-url | 2.2.0 |
| | psycopg2-binary | 2.9.9 |
| | openpyxl (Excel eksport) | 3.1.5 |
| Bot | grammY | latest |
| | tsx (runtime) | latest |
| | pdf-parse | ^1.1.1 |
| AI | Google Gemini 2.5 Flash (asosiy) | API |
| | Google Gemini 2.0 Flash (zahira) | API |
| | Gemini 2.5 Flash Preview TTS | API |
| DB | SQLite (lokal, WAL rejimi) | — |
| | PostgreSQL (prod, `DATABASE_URL`) | — |
| Cache | DatabaseCache (`django_cache_table`) yoki Redis (`REDIS_URL`) | — |
| Hosting | Render (gunicorn + WhiteNoise) | — |
| Monorepo | npm workspaces + concurrently | — |

### 3.2 Telegram SDK haqida

**🐞 MUHIM:** `README.md` da `@twa-dev/sdk` ishlatiladi deyilgan, ammo **`frontend/package.json` da bu paket YO'Q**. Kod `window.Telegram.WebApp` global obyektiga to'g'ridan-to'g'ri murojaat qiladi (`frontend/src/hooks/useTelegram.ts`). Telegram SDK skripti `index.html` orqali yuklanadi.

---

## 4. REPOZITORIYA TUZILMASI

```
ZakovatApp/
├── package.json                 # monorepo root (workspaces: frontend, bot)
├── README.md                    # qisqacha tavsif
├── DEPLOY.md                    # deploy ko'rsatmasi
├── TZ.md                        # ← ushbu hujjat
├── scripts/
│   └── run-django.js            # Django dev serverni ko'taruvchi cross-platform skript
├── .kiro/hooks/                 # Kiro agent hooki (auto-commit) — Windows yo'llari qolgan
├── .vscode/settings.json        # bo'sh
│
├── backend-django/              # ══ BACKEND ══
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile                 # Render start komandasi
│   ├── build.sh                 # Render build skripti
│   ├── .env.example
│   ├── seed.sql / seed_extra.sql
│   ├── zakovat/
│   │   ├── settings.py          # BARCHA sozlamalar (404 qator)
│   │   ├── urls.py              # root URL router + SPA fallback
│   │   └── wsgi.py
│   └── apps/                    # 18 ta Django app
│       ├── core/                # auth middleware, decorators, AppSettings, notifier
│       ├── auth_api/            # login, whoami
│       ├── users/               # User, BotAdmin, PremiumSettings, MilestoneState, achievements
│       ├── questions/           # Question, QuestionReport
│       ├── answers/             # ticket, scoring, grading, gemini, TTS cache
│       ├── game_results/        # GameResult + statistika
│       ├── daily/               # kunlik topshiriq + streak
│       ├── teams/               # Team, TeamMember, TeamChatMessage
│       ├── battles/             # BattleChallenge/Round/Answer + service.py (engine)
│       ├── svoyak/              # Svoyak: kategoriya, savol, xona, o'yinchi, raund
│       ├── gamerooms/           # Online O'yin Xonasi
│       ├── zakovat_table/       # Interaktiv Zakovat Stoli (bot-only)
│       ├── ustoz_ai/            # Fan → Dars → A/B/C/D savol
│       ├── author_questions/    # foydalanuvchi savollari moderatsiyasi
│       ├── premium/             # PremiumRequest + admin/public endpointlar
│       ├── channels/            # majburiy Telegram kanallar
│       ├── admin_api/           # /api/admin/* (savol, foydalanuvchi, sozlama, kanal)
│       └── admin_board/         # admin xabar taxtasi (media Telegramda saqlanadi)
│
├── frontend/                    # ══ MINI APP ══
│   ├── vite.config.ts           # VITE_API_URL majburiy (build'da)
│   ├── tailwind.config.ts
│   ├── .env.example / .env.production
│   ├── index.html
│   ├── public/uchqun.png
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # asosiy oqim (1427 qator): bootstrap, raund, navigatsiya
│       ├── api/
│       │   ├── client.ts        # BARCHA backend chaqiruvlari (1303 qator)
│       │   └── ustoz.ts         # Ustoz AI API
│       ├── types/index.ts       # umumiy TypeScript tiplari
│       ├── i18n/                # 3 tilli matnlar (986 qator) + LanguageContext
│       ├── hooks/               # useTelegram, useTimer, useGameSounds, useAppSettings
│       ├── utils/               # achievements, haptics, nameQuality, share, questionFileParser
│       ├── components/          # ekranlar + AdminPanel (5226 qator)
│       │   └── admin/           # BoardSection, ChannelsSection, SettingsSection, SvoyakAdminSection
│       ├── svoyak/              # Svoyak ekranlari va overlaylar
│       ├── gameroom/            # O'yin xonasi ekranlari
│       ├── zakovatTable/        # Zakovat Stoli kuzatuv ekranlari
│       └── styles/globals.css
│
└── bot/                         # ══ TELEGRAM BOT ══
    ├── package.json
    ├── .env.example
    ├── tsconfig.json
    ├── scripts/send-milestone.mjs
    └── src/
        ├── bot.ts               # asosiy bot: menyu, state machine, callbacklar (2034 qator)
        ├── gameroom.ts          # O'yin Xonasi bot oqimi (1693 qator)
        └── zakovatTable.ts      # Zakovat Stoli bot oqimi (814 qator)
```

### 4.1 Kod hajmi

Jami taxminan **60 400 qator** (paket-lock va build artefaktlarsiz). Eng katta fayllar:

| Fayl | Qator |
|---|---|
| `frontend/src/components/AdminPanel.tsx` | 5226 |
| `bot/src/bot.ts` | 2034 |
| `backend-django/apps/gamerooms/repositories.py` | 1709 |
| `frontend/src/components/ProfileScreen.tsx` | 1703 |
| `bot/src/gameroom.ts` | 1693 |
| `frontend/src/App.tsx` | 1427 |
| `frontend/src/api/client.ts` | 1303 |
| `backend-django/apps/svoyak/repositories.py` | 1238 |

---

## 5. TIZIM ARXITEKTURASI

### 5.1 Umumiy sxema

```
                 ┌──────────────────────────────────┐
                 │        TELEGRAM CLIENT           │
                 │  (mobil / desktop / web)         │
                 └───────┬──────────────────┬───────┘
                         │                  │
             Mini App    │                  │   Bot chat
         (WebView, HTTPS)│                  │  (Bot API)
                         ▼                  ▼
        ┌────────────────────────┐   ┌──────────────────────┐
        │  FRONTEND (React/Vite) │   │  BOT (grammY, tsx)   │
        │  frontend/dist         │   │  bot/src/*.ts        │
        └───────────┬────────────┘   └──────────┬───────────┘
                    │                            │
   Authorization:   │                            │  Authorization:
   tma <initData>   │                            │  bot <BOT_INTERNAL_API_KEY>
                    │                            │  + X-On-Behalf-Of: <telegram_id>
                    ▼                            ▼
        ┌────────────────────────────────────────────────────┐
        │   BACKEND — Django 5 + DRF (gunicorn, 2 worker)    │
        │  ┌──────────────────────────────────────────────┐  │
        │  │ MIDDLEWARE                                   │  │
        │  │  CorsMiddleware                              │  │
        │  │  WhiteNoiseMiddleware  (SPA + static)        │  │
        │  │  Session / Common / Auth / Messages          │  │
        │  │  AdminProtectionMiddleware  (IP + brute)     │  │
        │  │  TelegramAuthMiddleware     (current_user)   │  │
        │  └──────────────────────────────────────────────┘  │
        │  18 ta app · views → repositories/service → ORM    │
        └───────┬──────────────────────┬─────────────┬───────┘
                │                      │             │
                ▼                      ▼             ▼
      ┌──────────────────┐   ┌──────────────┐  ┌──────────────┐
      │  SQLite / Postgres│   │ Cache        │  │ Google Gemini│
      │  (DATABASE_URL)   │   │ DB / Redis   │  │  API         │
      └──────────────────┘   └──────────────┘  └──────────────┘
                                     │
                                     ▼
                          ┌───────────────────────┐
                          │  Telegram Bot API     │
                          │  (DM, media saqlash,  │
                          │   getChatMember)      │
                          └───────────────────────┘
```

### 5.2 Kod qatlamlari (backend)

Har bir Django app quyidagi qatlamlarga bo'lingan:

| Qatlam | Fayl | Vazifasi |
|---|---|---|
| **URL** | `urls.py` | Yo'lni view'ga bog'lash |
| **View** | `views.py` | HTTP: kiruvchi ma'lumot validatsiyasi, auth dekoratorlari, javob shakli |
| **Biznes mantiq** | `repositories.py` / `service.py` | Tranzaksiyalar, race-condition himoyasi, o'yin qoidalari |
| **Model** | `models.py` | ORM sxemasi, cheklovlar, indekslar |
| **Yordamchi** | `scoring.py`, `grading.py`, `gemini.py`, `tickets.py`, `limits.py` | Sof funksiyalar |

**Qoida:** View'lar **hech qachon** to'g'ridan-to'g'ri ORM chaqirmasligi kerak — faqat `repositories`/`service` orqali. (Istisnolar: `ustoz_ai/views.py` va `admin_board/views.py` — ular repository qatlamisiz yozilgan.)

### 5.3 Javob formati konvensiyalari

| Qoida | Misol |
|---|---|
| Barcha JSON kalitlari **camelCase** | `telegramId`, `correctAnswer`, `timeRemainingMs` |
| DB maydonlari **snake_case** | `telegram_id`, `correct_answer` |
| Vaqt — **ISO 8601 string** | `"2026-09-07T10:30:00+05:00"` |
| Millisekundlar — **integer** | `timeRemainingMs: 45000` |
| Xato — `{"message": "..."}` + HTTP status | `AppError(403, "Admin huquqi kerak")` |
| Ro'yxat — `{"items": [...], "total": N}` yoki `{"<nom>": [...]}` | `{"questions": [...]}` |

### 5.4 Xato boshqaruvi

`apps/core/exceptions.py`:

- `AppError(status_code, message)` — biznes xatosi. DRF handler uni `{"message": "..."}` + status ga aylantiradi.
- `django_ratelimit.exceptions.Ratelimited` → `429 {"message": "Juda ko'p chaqiruv yuborildi, biroz kuting"}`.
- Boshqa DRF xatolari — `detail` maydoni `message` ga ko'chiriladi.

---

## 6. AUTENTIFIKATSIYA VA AVTORIZATSIYA

### 6.1 Umumiy tamoyil

Django'ning standart `django.contrib.auth` **API uchun ishlatilmaydi**. DRF sozlamalari:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
}
```

Buning o'rniga `TelegramAuthMiddleware` har bir so'rovda `request.current_user` va `request.auth_source` ni o'rnatadi.

### 6.2 Auth usullari

#### A) Mini App: `Authorization: tma <initData>`

Telegram WebApp `initData` HMAC-SHA256 orqali tekshiriladi (`apps/core/telegram_auth.py`):

```
secret_key   = HMAC_SHA256(key = b"WebAppData", msg = TELEGRAM_BOT_TOKEN)
expected     = HMAC_SHA256(key = secret_key, msg = data_check_string)
data_check_string = "\n".join(f"{k}={v}" for k in sorted(pairs))   # `hash` chiqarilgan
```

**Qo'shimcha tekshiruvlar (MAJBURIY):**

| Tekshiruv | Qiymat | Sabab |
|---|---|---|
| `hash` mavjudligi | bo'lmasa → `None` | Imzo yo'q |
| `hmac.compare_digest` | timing-safe | Timing attack |
| `auth_date` kelajakda emas | `age >= -60s` | Clock skew ruxsati |
| `auth_date` eskirmagan | `age <= 7 kun` (`INIT_DATA_MAX_AGE_SECONDS = 604800`) | Replay |
| `user.id` musbat butun son | `> 0` | Mehmon bilan chalkashish / manipulatsiya |
| `TELEGRAM_BOT_TOKEN` sozlangan | bo'lmasa hammasi rad etiladi | Fail-closed |

**Nima uchun 7 kun:** Telegram invite-link orqali ochilganda eskirgan keshlangan `initData` yuborishi mumkin. HMAC imzosi asosiy himoya, `auth_date` — qo'shimcha qatlam.

#### B) Bot: `Authorization: bot <BOT_INTERNAL_API_KEY>`

- **`BOT_INTERNAL_API_KEY`** — Telegram bot tokenidan **butunlay alohida** sir. Bot tokeni loglarda ko'rinishi mumkin, shuning uchun unga fallback **YO'Q** (`middleware.py:112`).
- Kalit `hmac.compare_digest` bilan solishtiriladi.
- **`X-On-Behalf-Of: <telegram_id>`** sarlavhasi bo'lsa — bot shu foydalanuvchi nomidan harakat qiladi (`auth_source = "bot"`).
- Sarlavha bo'lmasa — sintetik admin `TelegramUser(telegram_id=ADMIN_TELEGRAM_IDS[0], first_name="Bot")` qaytariladi.
- `ADMIN_TELEGRAM_IDS` bo'sh bo'lsa — bot auth umuman ishlamaydi.

#### C) Dev bypasslar (production'da o'chirilgan)

| Flag | Default | Ta'siri | Production himoyasi |
|---|---|---|---|
| `ALLOW_GUEST_AUTH` | `false` | `initData == "guest"` → `telegram_id=0` mehmon | `NODE_ENV=production` bilan birga bo'lsa → `ImproperlyConfigured` (server ko'tarilmaydi) |
| `ALLOW_DEV_TID` | `false` | Mehmon + `X-Dev-Tid: 12345` → shu ID bilan ishlash | Xuddi shunday — server ko'tarilmaydi |

**⚠️ Ikkalasi ham FAIL-CLOSED:** default o'chiq. `NODE_ENV` noto'g'ri sozlangan taqdirda ham bypass ochilib qolmaydi.

### 6.3 Dekoratorlar (`apps/core/decorators.py`)

| Dekorator | Talab | Xato |
|---|---|---|
| `@require_auth` | `request.current_user` mavjud | `401 Unauthorized` |
| `@require_bot_auth` | `current_user` + `auth_source == "bot"` | `401` yoki `403 "Bu amal faqat bot orqali bajarilishi mumkin"` |
| `@require_admin` | `is_admin(current_user.telegram_id)` | `401` yoki `403 "Admin huquqi kerak"` |

### 6.4 `is_admin()` mantig'i

```
is_admin(telegram_id):
    telegram_id <= 0            → False   # mehmon hech qachon admin emas
    telegram_id in ADMIN_TELEGRAM_IDS → True   # env super-admin
    BotAdmin.objects.filter(telegram_id=...).exists() → True   # DB admin
    (migratsiya ishlamagan bo'lsa Exception → False)
```

**Super-admin** (`_require_super_admin` — `admin_api/views.py:36`) — **faqat** `ADMIN_TELEGRAM_IDS` env ro'yxatidagilar. Faqat ular:
- yangi admin qo'sha oladi (`POST /api/admin/admins`)
- admin o'chira oladi (`DELETE /api/admin/admins/<id>`)
- boshqa adminning xabar taxtasidagi postini o'chira oladi

### 6.5 Django admin paneli himoyasi

Standart `/admin/` yo'li **mavjud emas**. Uch qatlamli himoya:

| Qatlam | Amalga oshirilishi |
|---|---|
| **1. Yashirin URL** | `ADMIN_SECRET_PATH` env, yoki avtomatik `cp-<sha256("zakovat-admin-path::" + SECRET_KEY)[:14]>`. URL'ni ko'rish: `python manage.py show_admin_url` |
| **2. IP whitelist** | `ADMIN_ALLOWED_IPS` (vergul bilan). Ro'yxatda bo'lmagan IP → `Http404` (mavjudligini ham oshkor qilmaydi) |
| **3. Brute-force** | 5 ta muvaffaqiyatsiz POST → 15 daqiqa blok (`429`). Cache kaliti `admin_block:<ip>` / `admin_fails:<ip>` |

IP `X-Forwarded-For` ning birinchi qiymatidan olinadi (Render reverse proxy).

---

## 7. MA'LUMOTLAR BAZASI MODELI

> Barcha modellarda `DEFAULT_AUTO_FIELD = BigAutoField`, aks holda ko'rsatilgan.

### 7.1 Foydalanuvchi va sozlamalar

#### `users` (`apps.users.User`)

| Maydon | Tur | Izoh |
|---|---|---|
| `telegram_id` | BigInteger, **unique**, index | Asosiy identifikator |
| `first_name`, `last_name`, `username` | Char(255), nullable | Telegram'dan |
| `display_name` | Char(255), nullable | Foydalanuvchi o'zi qo'ygan ism (max 30 belgi) |
| `score` | Integer, default 0, **index** | Umumiy ball (leaderboard uchun) |
| `unlocked_achievements` | JSON (list) | Ochilgan yutuq ID'lari |
| `referred_by` | BigInteger, nullable, index | Kim taklif qilgan |
| `language` | Char(10), default `"uz-latn"` | `uz-latn` \| `uz-cyrl` \| `ru` |
| `current_streak` | Integer, default 0 | Ketma-ket to'g'ri javoblar (yakka o'yin) |
| `premium_until` | DateTime, nullable, index | `> now()` → premium aktiv |
| `premium_granted_by_telegram_id` | BigInteger, nullable | Audit |
| `premium_granted_by_name` | Char(255), nullable | Audit |
| `premium_granted_at` | DateTime, nullable | Audit |
| `created_at`, `updated_at` | DateTime | auto |

Metod: `is_premium_active() → premium_until is not None and premium_until > now()`

#### `bot_admins` (`apps.users.BotAdmin`)
`telegram_id` (unique, index), `first_name`, `username`, `added_by`, `added_at`, `note`.

#### `premium_settings` (`apps.users.PremiumSettings`) — **singleton (id=1)**

| Maydon | Default | Izoh |
|---|---|---|
| `enabled` | `False` | **Master switch.** `False` → hech qanday cheklov yo'q |
| `price` | 0 | Faqat ko'rsatish uchun (to'lov integratsiyasi yo'q) |
| `currency` | `"so'm"` | |
| `duration_days` | 30 | Grant berishda default |
| `benefits` | `""` | Foydalanuvchiga ko'rinadigan matn |
| `card_number` | `""` | Karta raqami (foydalanuvchi nusxalaydi) |
| `card_holder` | `""` | Karta egasi F.I.O |
| `payment_details` | `""` | Qo'shimcha yo'riqnoma |
| `section_limits` | `{}` (JSON) | Bo'lim cheklovlari |

Kesh: `premium_settings_v1`, TTL **60 soniya**.

**Standart bo'lim limitlari** (`section_limits` da kalit bo'lmasa ishlatiladi):

| Bo'lim | limited | free_limit (kunlik) |
|---|---|---|
| `round` | true | 5 |
| `daily` | true | 5 |
| `battle` | true | 3 |
| `gameroom` | true | 5 |
| `svoyak` | — | cheksiz (standart ro'yxatda yo'q) |

#### `milestone_state` (`apps.users.MilestoneState`) — **singleton (id=1)**
`last_celebrated_user_milestone` (PositiveInteger, default 0) — oxirgi tabriklangan 100-lik chegara.

#### `app_settings` (`apps.core.AppSettings`) — **singleton (id=1)**

| Maydon | Default | Chegara |
|---|---|---|
| `battle_chat_enabled` | `True` | — |
| `battle_chat_poll_interval_ms` | 4000 | 1000–30000 |
| `battle_show_correct_on_timeout` | `True` | — |
| `tts_enabled` | `True` | — |
| `tts_default_muted` | `False` | — |
| `difficulty_easy_enabled` | `True` | — |
| `difficulty_medium_enabled` | `True` | — |
| `difficulty_hard_enabled` | `True` | — |
| `svoyak_coordinator_enabled` | `True` | — |
| `svoyak_time_per_question` | **70** (migratsiya `0005` bilan majburan) | 5–120 |

Kesh: `app_settings_v1`, TTL **60 soniya**. `invalidate_cache()` PATCH'dan keyin chaqiriladi.

### 7.2 Savollar

#### `questions` (`apps.questions.Question`) — PK: **UUID**

| Maydon | Tur | Izoh |
|---|---|---|
| `id` | UUID (default uuid4) | |
| `text` | Text | Savol matni |
| `correct_answer` | Text | To'g'ri javob |
| `wrong_answers` | JSON (list) | **Bo'sh** → erkin javob (AI baholaydi). **Aynan 3 ta** → A/B/C/D rejimi |
| `category` | Char(255), nullable, index | |
| `difficulty` | Char(20), nullable | `easy` \| `medium` \| `hard` |
| `time_limit_seconds` | PositiveSmallInt, nullable | 5–120. `NULL` → standart |

**Indekslar:** `(category, difficulty)`, `(difficulty)`.

#### `question_reports` (`apps.questions.QuestionReport`)
`question` FK (CASCADE), `reported_by` (BigInt), `created_at`.
**`unique_together = (question, reported_by)`** — spam himoyasi.

### 7.3 O'yin natijalari va kunlik topshiriq

#### `game_results` (`apps.game_results.GameResult`)
`telegram_id` (index), `correct_count`, `total_count`, `round_score`, `created_at`.

#### `daily_challenges` (`apps.daily.DailyChallenge`)
`date` (Date, **unique**, index), `question_ids` (JSON — 5 ta UUID string), `created_at`.

#### `daily_challenge_entries`
`telegram_id` (index), `date`, `correct_count`, `score_earned`, `streak_bonus`, `completed_at`.
**`unique_together = (telegram_id, date)`**

#### `daily_answers`
`telegram_id` (index), `date`, `question_id` (Char 36), `is_correct`, `points_earned`, `answered_at`.
**`unique_together = (telegram_id, date, question_id)`**

#### `user_daily_streaks`
`telegram_id` (**unique**), `current_streak`, `last_date`, `longest_streak`.

### 7.4 Jamoalar

#### `teams` (PK: UUID)
`name`, `code` (Char 10, **unique**, index), `owner_id` (BigInt, index), `max_members` (default **6**), `status` (`open` \| `in_battle` \| `closed`), `created_at`.

#### `team_members`
`team` FK (CASCADE), `telegram_id` (**unique**, index) — **bir foydalanuvchi bir vaqtning o'zida faqat bitta jamoada**.

#### `team_chat_messages` (PK: UUID)
`team` FK, `telegram_id` (index), `text` (max 500), `created_at` (index). Index: `(team, created_at)`.

### 7.5 Bellashuv (Battle)

#### `battle_challenges` (PK: UUID)
`challenger_team_id` (UUID, index), `opponent_team_id` (UUID, index), `status` (`pending` \| `in_progress` \| `finished` \| `declined`), `current_round_number` (default 0), `created_at`, `started_at`, `finished_at`.

> **Eslatma:** `accepted` statusi **ishlatilmaydi** — qabul qilingan taklif to'g'ridan-to'g'ri `in_progress` ga o'tadi.

#### `battle_rounds` (PK: UUID)
`battle` FK, `question_id` (UUID), `round_number`, `time_limit_seconds` (default 60), `started_at`, `ended_at`.

#### `battle_answers` (PK: UUID)
`battle` FK, `round` FK, `telegram_id` (index), `team_id` (UUID, index), `answer`, `is_correct`, `answered_at`, `response_time_ms`.
**`unique_together = (round, telegram_id)`** · Indekslar: `(round, telegram_id)`, `(battle, team_id)`.

### 7.6 Svoyak

#### `svoyak_category`
`name` (index), `icon_emoji`, `language` (default `uz-latn`, index), `order` (index), `is_active` (index), `created_at`.

#### `svoyak_question`
`category` FK, `value_tier` (10/20/30/40/50, index), `text`, `correct_answer`, `wrong_answers` (JSON), `question_type` (`text` \| `abcd`, default `abcd`), `time_seconds` (nullable, 5–300), `media_url`, `is_active`, `created_at`, `created_by`.
Index: `(category, value_tier, is_active)`.

#### `svoyak_room`
`code` (Char 6, **unique**, index), `host_telegram_id` (index), `status` (`lobby` \| `playing` \| `paused` \| `finished`), `current_round` FK (SET_NULL), `settings` (JSON), `created_at`, `started_at`, `finished_at`.

**`settings` JSON strukturasi (auto rejim):**
```json
{
  "auto_mode": true,
  "selected_category_id": 3,
  "selected_category_name": "Tarix",
  "selected_category_icon": "🏛️",
  "question_ids": ["12", "18", "25"],
  "question_index": 0,
  "total_questions": 3,
  "use_general_pool": false,
  "question_started_at_ms": 1757241600000,
  "question_time_seconds": 45,
  "current_question_text": "...",
  "current_correct_answer": "...",
  "auto_attempts": []
}
```

#### `svoyak_player`
`room` FK, `telegram_id` (index), `display_name`, `avatar_url`, `score` (**manfiy bo'lishi mumkin**), `status` (`connected` \| `disconnected` \| `kicked`), `role` (`player` \| `coordinator`), `last_buzz_at_ms`, `can_pick`, `last_seen_at`, `joined_at`.
**`unique_together = (room, telegram_id)`** · Tartib: `-score, joined_at`.

#### `svoyak_round`
`room` FK, `question` FK (PROTECT), `value` (denormalizatsiya qilingan), `status` (`reading` \| `waiting_buzz` \| `answering` \| `completed` \| `skipped`), `started_at`, `buzz_opened_at`, `buzz_winner` FK (SET_NULL), `buzz_winner_at_ms`, `buzz_attempts` (JSON), `answer_text`, `answer_correct`, `score_delta`, `ended_at`.

#### `svoyak_room_category_snapshot`
`room` FK, `category` FK (PROTECT), `questions_by_value` (JSON: `{"10": qid, ...}`), `used_value_tiers` (JSON list), `order`.
**`unique_together = (room, category)`**

### 7.7 Online O'yin Xonasi

#### `gameroom_room`
`code` (Char 6, unique, index), `name` (max 200), `admin_telegram_id` (index), `extra_admin_ids` (JSON: `[{telegram_id, name}]`), `join_password` (**hash**), `status` (`waiting` \| `active` \| `finished`), `current_question` FK (SET_NULL), `created_at`, `started_at`, `finished_at`.
Metod: `is_room_admin(telegram_id)`.

#### `gameroom_participant`
`room` FK, `telegram_id` (index), `display_name` (max 120), `total_points`, `speed_score_ms` (BigInt — **tiebreaker**), `joined_at`, `last_seen_at`.
**`unique_together = (room, telegram_id)`** · Tartib: `-total_points, speed_score_ms, joined_at`.

#### `gameroom_question`
`room` FK, `question_type` (`text` \| `audio` \| `image`), `body` (max 2000), `media_ref` (max 500 — Telegram `file_id` yoki URL), `caption` (max 500), `correct_answer`, `time_limit_seconds` (**30/60/90/120/180**, default 120), `point_value` (**1/2/3**), `order_index` (index), `status` (`pending` \| `active` \| `closed`), `is_bonus`, `is_quick`, `activated_at`, `closed_at`, `bank_question_id` (nullable, index), `created_at`.
Indekslar: `(room, status)`, `(room, order_index)`.

#### `gameroom_submission`
`question` FK, `participant` FK, `answer_text` (max 500), `is_correct` (nullable = baholanmagan), `points_awarded` (nullable), `graded_by` (`""` \| `auto` \| `manual`), `grading_note` (max 300), `submitted_at`, `updated_at`.
**`unique_together = (question, participant)`** · Indekslar: `(question, participant)`, `(question, is_correct)`.

### 7.8 Interaktiv Zakovat Stoli

**Konstantalar:** `TEAM_SIZE = 6`, `QUESTION_COUNT = 12`, `WIN_SCORE = 6`, `DISCUSSION_SECONDS = 60`.

#### `zakovat_table_room`
`code` (Char 10, unique, index), `admin_telegram_id` (index), `status` (`waiting` \| `team_confirmed` \| `in_progress` \| `discussion` \| `awaiting_answer` \| `verifying` \| `finished`), `team_score`, `fans_score`, `current_question` FK (SET_NULL), `discussion_deadline`, `captain_answer_text`, `captain_answer_is_voice`, `winner` (`team` \| `fans` \| `draw` \| `""`), `created_at`, `started_at`, `finished_at`.

#### `zakovat_table_player`
`room` FK, `telegram_id` (index), `display_name`, `seat` (1–6), `is_captain`, `joined_at`.
**`unique_together = (room, telegram_id)` va `(room, seat)`**

#### `zakovat_table_question`
`room` FK, `sector` (1–12), `text`, `answer`, `used` (index), `created_at`.
**`unique_together = (room, sector)`**

#### `zakovat_table_spectator`
`room` FK, `telegram_id` (index), `joined_at`. **`unique_together = (room, telegram_id)`**

### 7.9 Ustoz AI

#### `ustoz_subject`
`name` (index), `icon_emoji` (default `📚`), `description`, `order` (index), `is_active` (index), `created_at`, `created_by`.

#### `ustoz_lesson`
`subject` FK, `name` (max 200), `description`, `order`, `is_active`, `created_at`, `created_by`.
Index: `(subject, is_active, order)`.

#### `ustoz_question`
`lesson` FK, `text`, `option_a`..`option_d` (Char 500), `correct_option` (`a`\|`b`\|`c`\|`d`), `explanation`, `order`, `is_active`, `created_at`, `created_by`.
Index: `(lesson, is_active, order)`.

### 7.10 Qolgan jadvallar

| Jadval | Model | Asosiy maydonlar |
|---|---|---|
| `author_questions` | `AuthorQuestion` | `telegram_id`, `author_name`, `question_text`, `answer`, `status` (`pending`\|`approved`\|`rejected`), `reviewed_by_*`, `reject_reason` |
| `premium_requests` | `PremiumRequest` | `telegram_id`, `display_name`, `username`, `status`, `receipt_file_id`, `amount`, `currency`, `reviewed_by_*`, `reject_reason`, `granted_until` |
| `required_channels` | `RequiredChannel` | `channel_id`, `channel_username`, `channel_title`, `channel_url`, `passed_users` (M2M → User), `is_active` (soft-delete), `added_by_*` |
| `admin_board` (`AdminPost`) | `AdminPost` | `author_telegram_id`, `author_name`, `text`, `media_type` (`""`\|`image`\|`video`), `media_file_id`, `created_at` |
| `tts_cache` | `TtsCache` | `text_hash` (PK, sha256), `audio_b64`, `created_at` |

---
## 8. FUNKSIONAL TALABLAR — O'YIN REJIMLARI

### 8.1 Yakka o'yin (raund)

**Ekranlar:** `home` → `question` → `result` → (takror) → `finish`
**Backend:** `apps/questions`, `apps/answers`, `apps/game_results`

#### Oqim

```
1. Foydalanuvchi qiyinlikni tanlaydi (🟢 Oson / 🟡 O'rtacha / 🔴 Qiyin / 🎲 Barchasi)
2. GET /api/questions/round?count=10&difficulty=easy
       → premium limit tekshiriladi (check_and_consume(user, "round"))
       → ORDER BY RANDOM() LIMIT 10
       → har savolga `options` (4 ta, aralashtirilgan) yoki bo'sh massiv
3. Har savol uchun:
   a. POST /api/answer/ticket {questionId}      → imzolangan bilet
   b. (ixtiyoriy) POST /api/answer/tts {text}   → savol ovozi
   c. Taymer boshlanadi (90 soniya, frontend)
   d. POST /api/answer {ticket, userAnswer, betAmount?}
        → bilet tekshiriladi + consume qilinadi
        → vaqt tekshiriladi
        → bet yechiladi (agar vaqt tugamagan bo'lsa)
        → baholanadi (A/B/C/D → aniq taqqoslash; erkin matn → Gemini)
        → ball yoziladi
   e. Yoki: POST /api/answer/reveal {ticket}  ("Javobni bilmayman")
4. 10 savol tugagach: POST /api/game-results {correctCount, totalCount, roundScore}
5. POST /api/users/me/check-achievements → yangi yutuqlar + bonus
```

#### Talablar

| № | Talab |
|---|---|
| R-1.1 | Savol tanlash **tasodifiy** bo'lishi shart (`ORDER BY RANDOM()`), Python xotirasiga butun jadval yuklanmasin |
| R-1.2 | `count` — 1..20 oralig'ida (default 10), chegaradan chiqsa qisqartiriladi |
| R-1.3 | `difficulty` faqat `easy`/`medium`/`hard`; boshqasi → `400` |
| R-1.4 | **⚠️ `correctAnswer` public javobda YUBORILMAYDI.** Frontend faqat `options` massivini oladi (4 ta variant, ichida to'g'risi bor) |
| R-1.5 | Variantlar **crypto-shuffle** (Fisher-Yates + `secrets.randbelow`) bilan aralashtiriladi — "har doim A" pattern bo'lmasin |
| R-1.6 | `options` faqat `wrong_answers` **aynan 3 ta** bo'lganda to'ldiriladi; aks holda bo'sh massiv (erkin javob rejimi) |
| R-1.7 | Har javob uchun **bir martalik bilet** majburiy |
| R-1.8 | Qiyinlik tugmalari `AppSettings.difficulty_*_enabled` orqali admin tomonidan yoqib/o'chiriladi |

### 8.2 Kunlik topshiriq (Daily Challenge)

**Ekran:** `daily` · **Backend:** `apps/daily`

#### Qoidalar

| № | Talab |
|---|---|
| R-2.1 | Har kun uchun **5 ta savol** (`DAILY_QUESTION_COUNT = 5`), **barcha foydalanuvchilar uchun bir xil** |
| R-2.2 | Sana `timezone.localdate()` — **Asia/Tashkent** |
| R-2.3 | Kun boshida savollar avtomatik tanlanadi (`get_or_create_today`) va `daily_challenges` ga yoziladi |
| R-2.4 | Bir foydalanuvchi kuniga **bir marta** yakunlay oladi (`unique_together`) — takror → `409` |
| R-2.5 | `correct_count` va `score_earned` **kliyentdan qabul qilinmaydi** — `daily_answers` jadvalidan hisoblanadi |
| R-2.6 | Hech bo'lmasa 1 ta javob yuborilmagan bo'lsa → `403 "Savollarni yechmasdan topshiriqni yakunlab bo'lmaydi"` |
| R-2.7 | Mehmon (`telegram_id <= 0`) kunlik topshiriq bajarolmaydi → `403` |
| R-2.8 | Javoblar `/api/answer` orqali beriladi; agar savol bugungi ro'yxatda bo'lsa — `DailyAnswer` avtomatik yoziladi |

#### Streak (ketma-ketlik) mantig'i

```
if last_date == kecha:  current_streak += 1
else:                   current_streak = 1
longest_streak = max(longest_streak, current_streak)
```

#### Streak bonusi (kamayish tartibida tekshiriladi)

| Streak ≥ | Bonus ball |
|---|---|
| 30 | 20 |
| 14 | 14 |
| 7 | 7 |
| 3 | 3 |
| < 3 | 0 |

Bonus `users.score` ga qo'shiladi (atomik tranzaksiya ichida).

### 8.3 Jamoa rejimi

**Ekran:** `team` · **Backend:** `apps/teams`

| № | Talab |
|---|---|
| R-3.1 | Jamoa nomi: **2–30 belgi** |
| R-3.2 | Kod: **6 belgi**, `A-Z0-9`, `secrets.choice` bilan (taxmin qilib bo'lmasin). Kolliziyada **8 marta** qayta urinish |
| R-3.3 | Maksimal a'zo: **6** (`max_members`) |
| R-3.4 | Bir foydalanuvchi **faqat bitta** jamoada (`team_members.telegram_id` unique) |
| R-3.5 | Qo'shilish `select_for_update` bilan atomik — TOCTOU race yo'q. To'lgan bo'lsa → `409` |
| R-3.6 | `status != "open"` bo'lsa qo'shilib bo'lmaydi (`409 "Bu jamoa hozir o'yinda yoki yopiq"`) |
| R-3.7 | **⚠️ Mehmon jamoa yarata/qo'shila olmaydi** — `telegram_id=0` yagona DB qatori bo'lgani uchun barcha mehmonlarga "leak" bo'lardi |
| R-3.8 | Chiqish: oxirgi a'zo chiqsa jamoa **o'chiriladi**; sardor chiqsa — eng erta qo'shilgan a'zo yangi sardor bo'ladi |
| R-3.9 | Sardorlikni o'tkazish: faqat joriy sardor, faqat mavjud a'zoga, `select_for_update` bilan qayta tasdiqlanadi |
| R-3.10 | Chat: xabar **≤500 belgi**, oxirgi **50** ta xabar qaytariladi (eski → yangi tartibda) |
| R-3.11 | Chat faqat a'zolar uchun; raqib jamoa ko'rmaydi |
| R-3.12 | Taklif havolasi: `https://t.me/<bot>?startapp=join_<CODE>` |

### 8.4 Bellashuv (Battle)

**Ekran:** `battle` · **Backend:** `apps/battles` (`service.py` — o'yin dvigateli)

#### Konstantalar

| Konstanta | Qiymat |
|---|---|
| `TOTAL_ROUNDS` | 10 |
| `ROUND_TIME_LIMIT_SECONDS` | **60** |
| `TIMEOUT_GRACE_MS` | 2000 |
| `MIN_QUESTIONS_FOR_BATTLE` | 5 |
| `WINNER_BONUS` | **5** ball (g'olib jamoaning **har** a'zosiga) |

#### Hayot sikli

```
pending ──accept──► in_progress ──10 raund──► finished
   │                     │
   ├──decline──► declined├──forfeit──► finished (chiquvchi yutqazadi)
   └──cancel───► declined
```

#### Talablar

| № | Talab |
|---|---|
| R-4.1 | Taklifni **faqat jamoa egasi** yubora oladi; jamoa `status == "open"` bo'lishi shart |
| R-4.2 | O'z jamoasiga taklif yuborib bo'lmaydi |
| R-4.3 | Ikkala jamoada ham faol taklif bo'lmasligi kerak → `409` |
| R-4.4 | Qabul qilishni **faqat raqib jamoa egasi** bajaradi |
| R-4.5 | **⚠️ Javobni faqat SARDOR (jamoa egasi) beradi** — oddiy a'zolar javob bera olmaydi |
| R-4.6 | O'yin boshlanishi **bitta atomik tranzaksiya**: status o'zgarishi + 10 raund yaratish + jamoa statuslari + 1-raund `started_at`. Xato bo'lsa hammasi rollback (zombi holat bo'lmaydi) |
| R-4.7 | Raund tugaydi: (a) vaqt tugasa, YOKI (b) **ikkala sardor** javob berganda |
| R-4.8 | Raund `started_at` bo'lmasa → `409 "Round hali tayyor emas"` (`_now_ms()` ga fallback qilinmaydi — bu taymerni qayta boshlab yuborardi) |
| R-4.9 | Har to'g'ri javob uchun sardorga **+1 shaxsiy ball** |
| R-4.10 | G'olib — ko'proq to'g'ri javob bergan jamoa; teng → durang (bonus yo'q) |
| R-4.11 | **Forfeit:** chiquvchi jamoa **doim yutqazadi** (hisob qanday bo'lishidan qat'i nazar) — oldinda turgan jamoa "chiqib ketib" g'alabani qulflay olmasin |
| R-4.12 | Forfeitni **faqat jamoa egasi** qila oladi (oddiy a'zo butun jamoani yutqaztirmasin) |
| R-4.13 | To'g'ri javob frontend'ga **faqat** foydalanuvchi javob bergandan keyin yoki vaqt tugagach yuboriladi |
| R-4.14 | Yakunda ikkala jamoa statusi `open` ga qaytariladi |
| R-4.15 | Frontend `/api/battles/<id>/state` ni **har 2 soniyada** polling qiladi |

#### Race-condition himoyasi (atomik "gate"lar)

| Funksiya | Nima qiladi | Nimadan saqlaydi |
|---|---|---|
| `try_start_game` | `pending → in_progress` (faqat bir marta) | Double-tap accept |
| `try_end_round` | `ended_at IS NULL` bo'lsagina belgilaydi | Raundni ikki marta yopish |
| `try_advance_current_round` | `current_round_number` ni atomik ko'chiradi | Raund sakrab ketishi |
| `try_finalize` | `in_progress → finished` (faqat bir marta) | Bonusni ikki marta berish |
| `try_cancel_or_decline` | `pending → declined` | Ikki marta bekor qilish |
| `has_user_answered` (Gemini'dan **oldin**) | Duplicate tekshiruvi | Ortiqcha LLM chaqiruvi va xarajat |

#### Telegram bildirishnomalari

| Hodisa | Kimga |
|---|---|
| Taklif yaratildi | Raqib jamoa barcha a'zolariga |
| Taklif bekor qilindi | Raqib jamoa a'zolariga |
| Taklif rad etildi | Chaqiruvchi jamoa a'zolariga |
| O'yin boshlandi | Ikkala jamoa a'zolariga |
| O'yin tugadi | Ikkala jamoa a'zolariga (g'olib/mag'lub/durang) |

Yuborish `threading.Thread(daemon=True)` orqali **fonda** — view tezda javob qaytaradi.

### 8.5 Svoyak — klassik doska rejimi

**Ekran:** `svoyak` → `SvoyakLobbyScreen` → `SvoyakBoardScreen` · **Backend:** `apps/svoyak`

#### Kod generatsiyasi

Alifbo: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — **`I`, `O`, `0`, `1` chiqarib tashlangan** (foydalanuvchi adashmasin). Uzunlik 6, `secrets.choice`, 16 marta qayta urinish.

#### Doska tuzilishi

- Host bir yoki bir nechta **kategoriya** tanlaydi (`categoryIds`)
- Har kategoriyada **5 ta ball qiymati**: 10 / 20 / 30 / 40 / 50
- Xona yaratilishida **snapshot** olinadi: har qiymat uchun bittadan tasodifiy savol tanlanadi (`secrets.choice`) va `questions_by_value` ga yoziladi
- **Bir savol ikki marta tushmaydi** — `used_value_tiers` ro'yxati
- Agar biror kategoriyada biror ball qiymati uchun savol bo'lmasa → `400 "«X» kategoriyasida N ballik savol yo'q"`

#### Raund holati mashinasi

```
reading ──open_buzz──► waiting_buzz ──buzz──► answering ──submit_answer──► completed
   │                        │                     │
   └────────────────────────┴──── skip ───────────┴──────────────────────► skipped
```

| № | Talab |
|---|---|
| R-5.1 | O'yin boshlanishi uchun **kamida 2 ta ulangan o'yinchi** (`role="player"`) |
| R-5.2 | Faqat `can_pick=True` bo'lgan o'yinchi savol tanlay oladi |
| R-5.3 | Oldingi raund tugamagan bo'lsa yangi pick → `409` |
| R-5.4 | BUZZ'ni **faqat host yoki koordinator** ochadi (`open_buzz`) |
| R-5.5 | `status == "reading"` da BUZZ bosish → `409 "BUZZ hali ochilmagan"` (cheat urinishi) |
| R-5.6 | **Birinchi BUZZ g'olib.** Server `time.time()*1000` — kliyent vaqtiga ishonilmaydi |
| R-5.7 | Kech qolgan BUZZ'lar `buzz_attempts` ga `winner: false` bilan yoziladi (rad etilmaydi, frontend "Kech qoldingiz" ko'rsatadi) |
| R-5.8 | **Koordinator BUZZ bosa olmaydi** → `403` |
| R-5.9 | Javobni **faqat BUZZ g'olibi** beradi → aks holda `403` |
| R-5.10 | To'g'ri → `score += value`; **noto'g'ri → `score -= value`** (ball **manfiy** bo'lishi mumkin) |
| R-5.11 | Pick huquqi: to'g'ri javob bergan o'yinchida qoladi; aks holda **eng past ballik** ulangan o'yinchiga o'tadi |
| R-5.12 | Skip: host, koordinator yoki BUZZ g'olibi qila oladi. Ball o'zgarmaydi |
| R-5.13 | O'yin tugaydi: barcha `kategoriya × 5` savol ishlatilganda yoki host `end_game` bosganda |
| R-5.14 | **⚠️ `correctAnswer` faqat raund `completed`/`skipped` bo'lganda qaytariladi** |
| R-5.15 | Baholash: `question_type == "abcd"` → Unicode NFC normalize + aniq taqqoslash; aks holda → Gemini |
| R-5.16 | Frontend holatni **har 500 ms** polling qiladi |
| R-5.17 | Mehmon Svoyak xonasi yarata/qo'shila olmaydi → `401` |

### 8.6 Svoyak — auto rejim

Agar `categoryIds` berilmasa (yoki faqat `categoryId` berilsa) — **auto rejim** yoqiladi (`settings.auto_mode = true`).

#### Savollar soni — host baliga va o'yinchilar soniga bog'liq

| Host bali ≥ | Yakka (1 o'yinchi) | Jamoa (2+) |
|---|---|---|
| 1000 | 8 | 12 |
| 600 | 7 | 11 |
| 300 | 6 | 10 |
| 150 | 5 | 9 |
| 50 | 4 | 8 |
| 0 | 3 | 7 |

#### Ikki fazali taymer

| Faza | Davomiylik | Holat |
|---|---|---|
| **reading** (o'qish) | `READING_TIME_MS = 10 000` ms | Javob **bloklangan** |
| **answering** (javob) | `question.time_seconds` yoki `AppSettings.svoyak_time_per_question` (default **70 s**) | Javob qabul qilinadi |
| grace | `AUTO_GRACE_MS = 2 000` ms | Tarmoq kechikishi uchun |

| № | Talab |
|---|---|
| R-6.1 | Auto rejimda **1 o'yinchi ham yetarli** (solo) |
| R-6.2 | BUZZ **yo'q** — har o'yinchi bir marta javob beradi |
| R-6.3 | Ball **progressiv**: 1-savol = 10, 2-savol = 20, ... `(index+1) × 10` |
| R-6.4 | O'qish fazasida javob → `409 "Savol o'qilmoqda — javob berish vaqti kelmadi (10 soniya kuting)"` |
| R-6.5 | Ikki marta javob → `409 "Siz allaqachon javob bergansiz"` |
| R-6.6 | Barcha ulangan o'yinchilar javob berganda → darhol keyingi savolga |
| R-6.7 | Vaqt tugaganda `get_state` polling'ida avtomatik keyingi savolga o'tiladi (`maybe_advance_auto`) |
| R-6.8 | **⚠️ Raund ochiq bo'lganda boshqa o'yinchilarning javob matni va to'g'ri/noto'g'ri belgisi YASHIRILADI** — faqat "javob berdi/bermadi" ko'rinadi (aldamchilik oldini olish) |
| R-6.9 | Baholash — har doim **Gemini** (erkin matn) |
| R-6.10 | Tanlangan mavzu bo'lsa — savollar faqat shu mavzudan, `value_tier` o'sish tartibida |
| R-6.11 | Svoyak kategoriyalari umuman bo'lmasa — **zahira**: umumiy `questions` jadvalidan tasodifiy tanlanadi (`use_general_pool = true`) |

### 8.7 Online O'yin Xonasi (GameRoom)

**Ekran:** `gameroom` · **Bot:** `bot/src/gameroom.ts` · **Backend:** `apps/gamerooms`

#### Rollar

| Rol | Huquq |
|---|---|
| **Global admin** | Yangi xona **yaratish** (`POST /api/gamerooms/admin/rooms`) |
| **Xona admini** | Xona ichidagi barcha boshqaruv: start, savol push, close, baholash, finish, eksport |
| **Ishtirokchi** | Kirish (kod + taxallus + parol), javob berish, reyting ko'rish |

#### Hayot sikli

```
waiting ──start──► active ──finish──► finished
             (kamida 1 ishtirokchi)
```

#### Savol oqimi

```
Admin savol push qiladi   → status=active, activated_at=now, room.current_question=q
   ▼
Ishtirokchilar javob yuboradi (deadline'gacha tahrirlash mumkin)
   ▼
Admin savolni yopadi (close)  → status=closed
   ▼
Baholash:  auto-grade  |  manual  |  bulk (guruh bo'yicha)  |  grade-rest-wrong
   ▼
Ball beriladi → leaderboard yangilanadi
   ▼
Keyingi savolni push qilish mumkin
```

| № | Talab |
|---|---|
| R-7.1 | Xona kodi: 6 belgi, `I/O/0/1` siz alifbo |
| R-7.2 | Parol **hash** holida saqlanadi (`_hash_room_password`), ochiq matnda emas |
| R-7.3 | Xona nomi ≤ 200 belgi; parol ≤ 50 belgi; taxallus ≤ 120 belgi |
| R-7.4 | **⚠️ Bir vaqtda faqat BITTA aktiv savol.** Oldingisi yopilmagan bo'lsa yangisini push qilish → `409` |
| R-7.5 | `time_limit_seconds` faqat {30, 60, 90, 120, 180}; `point_value` faqat {1, 2, 3}; `question_type` faqat {text, audio, image} |
| R-7.6 | Savol matni ≤ 2000 belgi; javob ≤ 500 belgi |
| R-7.7 | **Deadline server tomonida** hisoblanadi: `activated_at + time_limit_seconds`. `GRACE_MS = 2000` ms qo'shiladi |
| R-7.8 | Javob **upsert**: `(question, participant)` unique. Deadline'gacha tahrirlash mumkin |
| R-7.9 | Tahrirlangan javob **baholanishini bekor qiladi** (`is_correct=None`, `points_awarded=None`, `graded_by=""`) |
| R-7.10 | Avto-baholash: 1) aniq taqqoslash (bepul, tez) → 2) mos kelmasa Gemini. **Idempotent** — allaqachon baholangan o'tkazib yuboriladi |
| R-7.11 | Avto-baholash `correct_answer` bo'sh bo'lsa → `400` |
| R-7.12 | Baholashda atomik gate: `Submission.objects.filter(id=..., graded_by="").update(...)` — birinchi yozuvchi g'olib |
| R-7.13 | Leaderboard tartibi: `total_points ↓`, keyin **`speed_score_ms ↑`** (tezroq javob bergan yuqorida), keyin `joined_at` |
| R-7.14 | `speed_score_ms` = to'g'ri javoblar uchun `(submitted_at − activated_at)` yig'indisi |
| R-7.15 | **⚠️ Savol ochiq bo'lganda** `correctAnswer` faqat adminga ko'rinadi; ishtirokchi o'z javobining `isCorrect`/`pointsAwarded` ini ham ko'rmaydi |
| R-7.16 | Media (audio/rasm) Telegram `file_id` sifatida saqlanadi va `/api/gamerooms/rooms/<code>/questions/<id>/media` orqali proxy qilinadi |
| R-7.17 | Savolni **bekor qilish** (cancel): submissionlar o'chadi, berilgan ballar teskari qaytariladi |
| R-7.18 | Natijalarni **.xlsx** ga eksport qilish (openpyxl) |
| R-7.19 | Xonaning matn savollarini **umumiy savol bankiga** saqlash mumkin (`bank_question_id` bilan takrorlanmaslik kafolati) |
| R-7.20 | Xona tugatilganda aktiv savol avtomatik yopiladi; `finish` **idempotent** |
| R-7.21 | Taklif havolasi: `https://t.me/<bot>?startapp=room_<CODE>` yoki `/start room_<CODE>` |

#### Guruhlangan baholash (admin uchun tezkor rejim)

Bir xil (normalize qilingan) javoblar guruhlanadi. Admin bir bosishda butun guruhni to'g'ri/noto'g'ri deb belgilaydi:
- `GET .../submissions/grouped` → `{groups: [{normalizedKey, count, sample, ...}]}`
- `POST .../bulk-grade` `{normalizedKey, isCorrect}`
- `POST .../grade-rest-wrong` — qolgan barcha baholanmaganlarni noto'g'ri deb belgilaydi

### 8.8 Interaktiv Zakovat Stoli

**Boshqaruv: FAQAT BOT orqali.** Mini App'da faqat **kuzatish** (spectator) ekrani mavjud.
**Bot:** `bot/src/zakovatTable.ts` · **Backend:** `apps/zakovat_table`

#### Konstantalar

| Konstanta | Qiymat |
|---|---|
| `TEAM_SIZE` | 6 o'yinchi |
| `QUESTION_COUNT` | 12 savol (sektor 1–12) |
| `WIN_SCORE` | 6 ball |
| `DISCUSSION_SECONDS` | 60 soniya |

#### To'liq oqim

```
1. Admin xona yaratadi          → 4+ belgili kod, botda "#ZK-XXXX" ko'rinishida
2. Birinchi 6 kishi qo'shiladi  → seat 1..6; seat=1 AVTOMATIK KAPITAN
   (Muxlislar cheklanmagan sonda spectator sifatida kuzatadi)
3. Admin jamoani tasdiqlaydi    → status: waiting → team_confirmed   (6/6 shart)
4. Admin roppa-rosa 12 ta savol yuklaydi (matn + javob juftligi)
5. Admin o'yinni boshlaydi      → status: in_progress
6. RAUND:
   a. Admin "otni aylantiradi" (spin) → tasodifiy ISHLATILMAGAN sektor
      → status: discussion, discussion_deadline = now + 60s
   b. 60 soniya muhokama (bot timer bilan kuzatadi)
   c. advance-discussion        → status: awaiting_answer
   d. Kapitan yakuniy javob beradi (matn YOKI ovozli xabar)
      → status: verifying
   e. Admin QO'LDA baholaydi:
         to'g'ri  → team_score  += 1
         noto'g'ri → fans_score += 1
   f. 6 ballga birinchi yetgan tomon g'olib → status: finished
      aks holda → status: in_progress (keyingi raundga)
7. 12 savol tugab, hech kim 6 ga yetmasa → hisob bo'yicha g'olib / durang
```

| № | Talab |
|---|---|
| R-8.1 | **Barcha boshqaruv endpointlari `@require_bot_auth`** — mini-app'dan chaqirib bo'lmaydi |
| R-8.2 | Yagona istisno — `GET /rooms/<code>/state`: `@require_auth`. `tma` bilan kelganda **admin-only maydonlar (to'g'ri javob, kapitan javobi) hech qachon qaytarilmaydi** |
| R-8.3 | Birinchi qo'shilgan **avtomatik kapitan** (`seat=1`, `is_captain=True`) |
| R-8.4 | 6 kishidan keyin yangi o'yinchi qabul qilinmaydi |
| R-8.5 | Muxlis (spectator) o'yin holatiga **hech qanday ta'sir qilmaydi** |
| R-8.6 | Savollar **aynan 12 ta** bo'lishi shart, qayta yuklab bo'lmaydi |
| R-8.7 | Spin **hech qachon ishlatilgan sektorni takrorlamaydi** (`used=True`) |
| R-8.8 | Muhokama deadline **server tomonida** tekshiriladi — muddatidan oldin `advance-discussion` chaqirib bo'lmaydi |
| R-8.9 | Yakuniy javobni **faqat kapitan** beradi → aks holda `403` |
| R-8.10 | Baholash **AI'siz** — faqat admin qo'lda (spec talabi) |
| R-8.11 | Bot 60 soniyalik timerni `setTimeout` bilan kuzatadi; `DISCUSSION_GRACE_MS=1500`, `ADVANCE_RETRY_MS=3000`, `ADVANCE_MAX_ATTEMPTS=3` |
| R-8.12 | Bot xabarlarni jonli yangilaydi (`refreshRoomViews`) — stol ko'rinishi, hisob, holat qatori |

### 8.9 Ustoz AI

**Ekranlar:** `ustozoAi` → `ustozoLessons` → `ustozoQuiz` · **Backend:** `apps/ustoz_ai`

**Ierarxiya:** `Subject (Fan)` → `Lesson (Dars)` → `UstozQuestion (A/B/C/D savol)`

| № | Talab |
|---|---|
| R-9.1 | Savol **doim** 4 variantli: `option_a`..`option_d` + `correct_option ∈ {a,b,c,d}` |
| R-9.2 | **⚠️ `correctOption` savollar ro'yxatida frontend'ga YUBORILMAYDI** — faqat tekshirish endpointi qaytaradi |
| R-9.3 | Tekshirish: `POST /api/ustoz/questions/<id>/check/` `{selected: "a"}` → `{correct, correctOption, explanation}` |
| R-9.4 | `selected` faqat `a`/`b`/`c`/`d`; aks holda `400` |
| R-9.5 | Public endpointlar faqat `is_active=True` yozuvlarni qaytaradi |
| R-9.6 | Admin CRUD `/api/admin/ustoz/*` (require_admin) va bot menyusi orqali |
| R-9.7 | Frontend'da quiz: **15 soniya taymer** va ball tizimi (commit `e2bbbbb`), ovozli effektlar (`f3aa632`, `e7fcdb4`) |

### 8.10 Muallif savollari

**Backend:** `apps/author_questions`

| № | Talab |
|---|---|
| R-10.1 | Hayot sikli: `pending` → `approved` \| `rejected` |
| R-10.2 | Bir foydalanuvchida bir vaqtda **maksimum 3 ta** `pending` savol (`MAX_PENDING_PER_USER = 3`) |
| R-10.3 | Chegaralar: savol ≤ **2000**, javob ≤ **500**, muallif ismi ≤ **100** belgi |
| R-10.4 | **⚠️ Tasdiqlangan savol asosiy `questions` jadvaliga QO'SHILMAYDI** — alohida "Mualliflik savollari" poolida qoladi |
| R-10.5 | Yangi savol yuborilganda **barcha adminlarga** Telegram xabari yuboriladi |
| R-10.6 | Approve/reject **idempotent**: takror approve → o'sha yozuv; rad etilganni tasdiqlash → `400` va aksincha |
| R-10.7 | Natija haqida foydalanuvchiga Telegram xabari yuboriladi (rad etilsa — sabab bilan) |

### 8.11 Premium (obuna)

**Ekran:** `premium` · **Backend:** `apps/premium` + `apps/users.PremiumSettings` + `apps/premium/limits.py`

#### Limit tekshiruvi (`check_and_consume`)

```
1. PremiumSettings.enabled == False  → hech narsa qilmaydi (hamma erkin)
2. Bo'lim limited == False           → hech narsa qilmaydi
3. Foydalanuvchi premium aktiv       → hech narsa qilmaydi
4. free_limit == 0                   → 403 "... bepul foydalanuvchilar uchun mavjud emas"
5. used >= free_limit                → 403 "... bugungi bepul limit tugadi (used/limit)"
6. aks holda                         → counter += 1, davom etadi
```

| № | Talab |
|---|---|
| R-11.1 | **⚠️ Cache xatosi → FAIL-OPEN** — o'yin buzilmasin (faqat warning log) |
| R-11.2 | Hisoblagich kaliti: `premlimit:<telegram_id>:<section>:<YYYY-MM-DD>` — sana **Asia/Tashkent** |
| R-11.3 | Cache TTL: `26 * 60 * 60` soniya (yarim tun chegarasi xavfsiz kesib o'tilsin) |
| R-11.4 | `resetsAt` = ertangi kun mahalliy yarim tuni (ISO 8601) |
| R-11.5 | Bo'limlar: `round`, `daily`, `battle`, `svoyak`, `gameroom` |
| R-11.6 | `check_and_consume` chaqiriladi: `GET /questions/round`, `GET /daily/today`, `POST /battles/challenge`, `POST /gamerooms/admin/rooms` |

#### To'lov oqimi (to'lov integratsiyasi YO'Q — qo'lda tasdiqlash)

```
1. Foydalanuvchi PremiumScreen'da karta raqami va narxni ko'radi
2. Pul o'tkazadi, chekni rasmga oladi
3. POST /api/premium/request  (multipart, "receipt" fayli)
      → faqat image/*, ≤10 MB, bo'sh emas
      → rasm Telegram'ga yuboriladi (sendPhoto) → file_id saqlanadi
      → PremiumRequest(status=pending) yaratiladi, narx snapshot olinadi
      → BARCHA adminlarga Telegram xabari
4. Admin panel → Premium → So'rovlar → chekni ko'radi (proxy orqali)
5. Approve: POST /api/admin/premium/requests/<id>/approve {durationDays?}
      → base = max(now, mavjud premium_until)
      → premium_until = base + durationDays
      → audit maydonlari to'ldiriladi
      → foydalanuvchiga Telegram xabari
   Reject: POST .../reject {reason?}
```

| № | Talab |
|---|---|
| R-11.7 | Foydalanuvchida **pending** so'rov bo'lsa yangisini yubora olmaydi → `400` |
| R-11.8 | `durationDays` 1–3650 oralig'ida; berilmasa `PremiumSettings.duration_days` |
| R-11.9 | Approve **idempotent** — ikki marta grant bermaydi. Rad etilganni tasdiqlash → `400` |
| R-11.10 | Premium **uzaytiriladi**, ustiga yozilmaydi (mavjud aktiv muddat asos bo'ladi) |
| R-11.11 | `GET /api/premium/info` **fail-soft**: migratsiya qo'llanmagan bo'lsa ham ekran ochiladi (minimal javob) |
| R-11.12 | Admin qo'lda ham grant/revoke qila oladi: `POST/DELETE /api/admin/users/<tid>/premium` |
| R-11.13 | Chek rasmi hech qachon serverda saqlanmaydi — faqat Telegram `file_id` |

### 8.12 Majburiy kanal obunasi

**Backend:** `apps/channels` · **Frontend:** `SubscriptionGate.tsx` · **Bot:** `checkAllSubscriptions`

| № | Talab |
|---|---|
| R-12.1 | Aktiv kanallar ro'yxati **auth'siz** olinadi (`GET /api/channels/`) |
| R-12.2 | Obuna tekshiruvi Telegram **`getChatMember`** orqali |
| R-12.3 | Obuna deb hisoblanadi: `member`, `administrator`, `creator`; `restricted` → `is_member` maydoniga qarab |
| R-12.4 | **⚠️ FAIL-CLOSED**: bot tokeni yo'q / tarmoq xatosi / Telegram xatosi → `False` (kirish beriladi emas) |
| R-12.5 | Hamma kanalga obuna bo'lsa — foydalanuvchi har kanalning `passed_users` M2M ga qo'shiladi (statistika) |
| R-12.6 | Kanal qo'shishda `getChat` bilan mavjudligi tekshiriladi, numeric ID olinadi |
| R-12.7 | Username formati: `^[A-Za-z0-9_]{4,}$` |
| R-12.8 | O'chirish — **soft delete** (`is_active=False`), tarix saqlanadi; qayta faollashtirish mumkin |
| R-12.9 | Bot `/start` da adminlarni tekshirmaydi (adminlar gate'dan ozod) |
| R-12.10 | Bot kanallar keshi TTL: **5 daqiqa** |
| R-12.11 | Mini App bootstrap'da obuna tekshiruvi **await** qilinadi — foydalanuvchi obunasiz o'ynay olmasin |

### 8.13 Reyting, referal va yutuqlar

#### Reyting

| Turi | Endpoint | Manba |
|---|---|---|
| **Umumiy** | `GET /api/users/leaderboard?period=all&limit=10\|20\|50\|100` | `users.score DESC` |
| **Oylik** | `GET /api/users/leaderboard?period=monthly` | `SUM(game_results.round_score)` shu oyning 1-sanasidan |
| **Top-3** | `GET /api/users/top?limit=3` | `users.score DESC` |
| **Taklif (umumiy)** | `GET /api/users/referrals?period=all` | `COUNT(users.referred_by = me)` |
| **Taklif (oylik)** | `GET /api/users/referrals?period=monthly` | Shu oy ro'yxatdan o'tganlar bo'yicha |

- `limit` faqat {10, 20, 50, 100}; boshqasi → 10
- Taklif reytingi limiti: **20** (`REFERRAL_LEADERBOARD_LIMIT`)
- O'rin (`rank`) = `COUNT(score > mening ballim) + 1`

#### Referal

- Havola: `https://t.me/<bot>?startapp=<telegram_id>`
- `POST /api/auth/login {initData, referrerId}` da o'rnatiladi
- **Qoidalar:** o'ziga o'zi referal bo'lolmaydi; referrer DB'da mavjud bo'lishi shart; `referred_by` **faqat bir marta** yoziladi (`referred_by__isnull=True` filtri)

#### Yutuqlar

| ID | Nomi | Shart | Bonus |
|---|---|---|---|
| `first-game` | Birinchi qadam | `gamesPlayed >= 1` | **5** |
| `ten-games` | Tajribali | `gamesPlayed >= 10` | **15** |
| `score-100` | Zukko | `totalScore >= 100` | **20** |
| `score-500` | Daho | `totalScore >= 500` | **50** |
| `best-round` | Rekordchi | `bestRoundScore >= 20` | **25** |

- **⚠️ Bonus faqat bir marta** — `users.unlocked_achievements` ro'yxatiga yoziladi
- Server-side hisoblanadi (`apps/users/achievements.py`) — localStorage manipulyatsiyasi ish bermaydi
- **Rate limit: 10 chaqiruv/daqiqa** (`ach_check:<tid>` cache kaliti)
- **MAJBURIY:** `frontend/src/utils/achievements.ts` va `backend/apps/users/achievements.py` **sinxron** bo'lishi shart

#### Milestone (100-lik chegara)

Har 100-chi yangi foydalanuvchi ro'yxatdan o'tganda **barcha adminlarga** tabrik yuboriladi.
- Holat DB'da: `MilestoneState.last_celebrated_user_milestone`
- `select_for_update()` — bir vaqtdagi ikki login bir xil milestone'ni ikki marta tabriklamaydi
- Har qanday xato **yutib yuboriladi** — login hech qachon buzilmaydi
- Ikki joyda amalga oshirilgan: backend `upsert_user` (login) va bot `notifyMilestoneIfNeeded` (`/start`)

### 8.14 Admin xabar taxtasi

**Backend:** `apps/admin_board` · **Frontend:** `components/admin/BoardSection.tsx`

| № | Talab |
|---|---|
| R-13.1 | Faqat adminlar ko'radi va yozadi (`@require_admin`) |
| R-13.2 | Media **Telegram'da saqlanadi** (`file_id`) — Render'ning efemer diski muammosini hal qiladi |
| R-13.3 | Rasm ≤ **10 MB**, video ≤ **50 MB** |
| R-13.4 | Saqlash chati: `ADMIN_MEDIA_CHAT_ID` yoki (bo'sh bo'lsa) post muallifining shaxsiy chati |
| R-13.5 | O'chirish: **muallif** yoki **super-admin** |
| R-13.6 | Media proxy: `GET /api/admin/board/<id>/media` (`Cache-Control: private, max-age=3600`) |
| R-13.7 | Pagination: default 20, maksimum 50 |

---

## 9. BALL VA BAHOLASH TIZIMI

### 9.1 Yakka o'yin / kunlik topshiriq (`apps/answers/scoring.py`)

| Konstanta | Qiymat |
|---|---|
| `FAST_ANSWER_MS` | **4 000** ms |
| `FAST_POINTS` | 2 |
| `BASE_POINTS` | 1 |
| `STREAK_THRESHOLD` | 3 |
| `STREAK_BONUS` | 1 |

```
incorrect →  0 ball,  streak = 0
partial   →  1 ball + streak_bonus,  streak += 1     (tezlik bonusi YO'Q)
correct   →  (time <= 4000ms ? 2 : 1) + streak_bonus,  streak += 1

streak_bonus = 1  agar  streak_after >= 3,  aks holda 0
```

**⚠️ Server-side cap:** bir javob uchun maksimum **3 ball** (`capped_points = min(score.points_earned, 3)`). Bet bundan tashqari.

**⚠️ `streak_before` har doim DB'dan o'qiladi** — kliyent qiymatiga ishonilmaydi.

### 9.2 Bet (garov) tizimi — Svoyak uslubidagi tikish

| Qoida | Qiymat |
|---|---|
| Ruxsat etilgan qiymatlar | `0`, `5`, `10`, `20`, `50` (`VALID_BETS`) |
| Boshqa qiymat | `400 "betAmount faqat 0 \| 5 \| 10 \| 20 \| 50 bo'lishi mumkin"` |

**Tartib (juda muhim!):**

```
1. Bilet tekshiriladi va consume qilinadi
2. VAQT tekshiriladi                    ← bet HALI yechilmagan
   vaqt tugagan bo'lsa → timeout javobi, bet YECHILMAYDI, streak = 0
3. Bet yechiladi (atomik: deduct_score_if_sufficient)
   yetarli ball yo'q → 400 "Yetarli ballingiz yo'q"
4. Javob baholanadi
5. correct  → betWon = +bet;  jami qo'shiladi: capped_points + 2*bet  (net +bet)
   boshqa   → betWon = −bet;  yechilgan pul qaytarilmaydi (net −bet)
```

**Nima uchun bunday tartib:** foydalanuvchi vaqtida javob bergan bo'lsa-yu tarmoq kechikishi tufayli server kech qabul qilsa — u jazolanmaydi.

**A/B/C/D rejimida noto'g'ri variant yuborilsa** (buzilgan ma'lumot / cheat urinishi) → bet **qaytarilmaydi**.

### 9.3 Ball hisoblash amallari (`apps/users/repositories.py`)

| Funksiya | Kafolat |
|---|---|
| `add_score(tid, amount)` | `amount > 0` bo'lishi **shart** (aks holda `ValueError`). `F("score") + amount` — atomik |
| `deduct_score_if_sufficient(tid, amount)` | `filter(score__gte=amount).update(score=F("score") - amount)` — **atomik**. `score` hech qachon manfiy bo'lmaydi. `False` qaytarsa hech narsa o'zgarmagan |

### 9.4 Vaqt tekshiruvi (yakka o'yin)

| Konstanta | Qiymat |
|---|---|
| Savol vaqti | `question.timeLimitSeconds` yoki fallback **90** soniya |
| `TIMEOUT_GRACE_MS` | **10 000** ms |
| Frontend taymeri | `TIMER_SECONDS = 90`, `ANSWER_TIMEOUT_MS = 90000` |

```
time_taken_ms = now_ms − ticket.issued_at_ms
if time_taken_ms > question_time_limit_ms + 10000:
    → streak = 0, timeout javobi, ball yo'q, bet yechilmaydi
```

**Nima uchun 10 s grace:** bilet TTS'dan **oldin** chiqariladi, shuning uchun serverdagi o'lchov = TTS davomiyligi + savol vaqti.

**🐞 Nomuvofiqlik:** `answers/views.py` da izoh "standart 15s" deydi, ammo kodda fallback `90`.

### 9.5 O'yin natijasi validatsiyasi (`POST /api/game-results`)

| Cheklov | Qiymat |
|---|---|
| `MAX_TOTAL_COUNT` | 20 |
| `MAX_ROUND_SCORE_MULTIPLIER` | 3 (max ball = `total × 3`) |
| Manfiy qiymatlar | `400` |
| `correct > total` | `400` |
| `MAX_RESULTS_PER_HOUR` | 20 |
| `MAX_RESULTS_PER_DAY` | 100 |

### 9.6 Rejimlar bo'yicha ball jadvali (jamlanma)

| Rejim | To'g'ri | Noto'g'ri | Bonus |
|---|---|---|---|
| Yakka / Kunlik | +1 (yoki +2 tez) | 0 | +1 streak ≥3 · daily streak 3/7/14/30 → 3/7/14/20 |
| Bellashuv | +1 (shaxsiy) | 0 | G'olib jamoa har a'zosiga **+5** |
| Svoyak klassik | **+value** (10..50) | **−value** | — |
| Svoyak auto | **+(index+1)×10** | 0 | — |
| O'yin xonasi | **+point_value** (1/2/3) | 0 | tiebreaker: `speed_score_ms` |
| Zakovat Stoli | Jamoa +1 | Muxlislar +1 | — (6 ballgacha) |
| Ustoz AI | Frontend'da ball | — | — |
| Yutuqlar | — | — | 5 / 15 / 20 / 50 / 25 |

---

## 10. AI (GOOGLE GEMINI) INTEGRATSIYASI

**Fayl:** `backend-django/apps/answers/gemini.py` (462 qator)

### 10.1 Modellar

| Vazifa | Model | Timeout |
|---|---|---|
| Javob baholash (asosiy) | `gemini-2.5-flash` | 15 s (+2 s future) |
| Javob baholash (zahira) | `gemini-2.0-flash` | 15 s |
| Savol izohi | `settings.GEMINI_MODEL` (default `gemini-2.5-flash`) | 15 s |
| TTS (ovoz) | `gemini-2.5-flash-preview-tts`, ovoz **"Kore"** | 15 s |

Chaqiruvlar `ThreadPoolExecutor(max_workers=4)` orqali bajariladi (gunicorn worker'ini bloklamaslik uchun).

### 10.2 Baholash kaskadi (`check_answer`)

```
0. Bo'sh javob                        → incorrect
1. LOKAL TEZ TEKSHIRUV (_normalize)   → mos kelsa: correct  (Gemini CHAQIRILMAYDI)
      apostrof olib tashlanadi:  o'rmonda == ormonda,  to'g'ri == togri
      tinish belgilari → bo'sh joy, ko'p bo'shliqlar birlashtiriladi
2. gemini-2.5-flash                   → JSON parse muvaffaqiyatli bo'lsa natija
3. gemini-2.0-flash (zahira)          → natija
4. _smart_local_check (AI'siz)        → oxirgi zahira
```

**Bu kaskad tufayli Gemini butunlay ishlamay qolsa ham o'yin ishlashda davom etadi.**

### 10.3 Prompt-injection himoyasi

| Chora | Amalga oshirilishi |
|---|---|
| **System instruction ajratilgan** | Qoidalar `system_instruction` da, ma'lumot alohida xabarda |
| **DATA bloki** | `=== DATA ===` ... `=== DATA TUGADI ===` orasida. Model blokdan tashqaridagi ko'rsatmalarni e'tiborsiz qoldirishga buyurilgan |
| **Sanitizatsiya** | `\x00-\x08`, `\x0b`, `\x0c`, `\x0e-\x1f`, `\x7f` o'chiriladi; `\n`, `\r` → bo'sh joy |
| **Uzunlik chegarasi** | `MAX_USER_ANSWER_LEN = 300` belgi |
| **Qat'iy JSON** | `{"status": "correct"|"partial"|"incorrect", "explanation": "..."}`; noto'g'ri status → `None` (zahira modelga o'tadi) |

### 10.4 Baholash qoidalari (system prompt mazmuni)

**"correct" hisoblanadi:**
- Katta-kichik harf, tinish belgilari farqi
- **O'zbek apostrofi yozilmasa ham** (`o'zbekiston` = `ozbekiston`)
- Imlo xatolari (`navoiy` = `navoi` = `navoy`)
- Raqam variantlari (`2026` = `2026-yil` = `ikki ming yigirma olti`)
- Faqat ism yoki faqat familiya (`Navoiy` = `Alisher Navoiy`)
- Joy nomi sinonimlari (`AQSh` = `Amerika` = `USA`)
- To'g'ri javobning asosiy so'zi foydalanuvchi javobida bo'lsa
- **Shubha bo'lsa → "correct" tomonga**

**"partial":** haqiqiy ikkilanish (`"Moskva yoki Qozon"`), juda umumiy lekin yo'nalish to'g'ri

**"incorrect":** butunlay boshqa odam / joy / aniq noto'g'ri raqam

### 10.5 Lokal zahira tekshiruv (`_smart_local_check`)

Gemini ishlamaganda ketma-ket 7 ta strategiya:

1. Aniq moslik (normalize'dan keyin)
2. Bo'shliqsiz solishtirish
3. To'g'ri javob foydalanuvchi javobi **ichida** mavjud
4. Foydalanuvchi javobi to'g'ri javob **so'zlari** ichida
5. Faqat raqamlarni solishtirish (`2026-yil` → `2026`)
6. **O'zbek raqam so'zlarini songa aylantirish** (`"ikki ming yigirma olti"` → `2026`)
7. Asosiy so'zlar (4+ harf) to'liq mos kelishi

**O'zbek raqam lug'ati** (`_uzbek_text_to_number`) kardinal va tartib sonlarni, hamda keng tarqalgan imlo xatolarini qamrab oladi:
`bir..to'qqiz`, `birinchi..to'qqizinchi`, `o'n/yigirma/o'ttiz/qirq/ellik/oltmish/yetmish/sakson/to'qson` (+ `on`, `yigrma`, `ottiz`, `toqson` variantlari), `yuz`, `ming`, `million`.
`yil`, `yilda`, `va`, `bu`, `shu`, `oxirgi` kabi so'zlar e'tibordan chetda qoldiriladi.

### 10.6 TTS (matnni ovozga aylantirish)

| Parametr | Qiymat |
|---|---|
| Endpoint | `POST /api/answer/tts {text}` |
| Matn chegarasi | 600 belgi (kesib olinadi) |
| Kesh | `tts_cache` jadvali, kalit = `sha256(text)` |
| Format | `audio/wav`, base64 |
| Rate limit | 30/daqiqa |
| Xato | `503 "TTS vaqtincha mavjud emas"` |
| Global o'chirish | `AppSettings.tts_enabled` |

Kesh jadvali yaratilmagan bo'lsa (migratsiya kutilmoqda) — xato yutiladi va audio baribir qaytariladi.

### 10.7 Savol izohi (`reveal`)

`POST /api/answer/reveal {ticket}` — "Javobni bilmayman" tugmasi.
- Bilet **consume qilinadi** (Gemini kvotasini qayta-qayta yoqmasin). Ishlatilgan bilet → `409`
- Javob: `{correctAnswer, explanation}` — 2–3 jumlali izoh o'zbek tilida
- Rate limit: 20/daqiqa

---
## 11. REST API — TO'LIQ RO'YXAT

### 11.0 Umumiy

- **Baza:** `<BACKEND_URL>/api`
- **Auth sarlavhasi:** `Authorization: tma <initData>` yoki `Authorization: bot <KEY>`
- **Content-Type:** `application/json` (istisno: `multipart/form-data` — chek va media yuklash)
- **Auth ustunidagi belgilar:**
  `—` auth shart emas · `A` `@require_auth` · `B` `@require_bot_auth` · `AD` `@require_admin` · `SA` super-admin · `RA` xona admini (repository darajasida)

### 11.1 Tizim

| Metod | Yo'l | Auth | Tavsif |
|---|---|---|---|
| GET | `/health` | — | `{"ok": true}` — health check |
| GET | `/<ADMIN_SECRET_PATH>/` | Django session | Django admin paneli (yashirin URL) |
| GET | `*` (boshqa yo'llar) | — | SPA fallback → `frontend/dist/index.html` (no-cache) |

### 11.2 Auth — `/api/auth/`

| Metod | Yo'l | Auth | Body | Javob |
|---|---|---|---|---|
| POST | `/auth/login` | — (rate 20/min IP) | `{initData, referrerId?}` | `{user, isAdmin}` |
| GET | `/auth/whoami` | — | — | Diagnostika: `{isAuthenticated, telegramId, isAdmin, environment, diagnostic}` |

> `whoami` sezgir ma'lumot qaytarmaydi; `allowedHosts` faqat super-adminlarga ko'rsatiladi.

### 11.3 Foydalanuvchilar — `/api/users/`

| Metod | Yo'l | Auth | Parametr / Body | Javob |
|---|---|---|---|---|
| GET | `/users/top` | A | `?limit=1..100` (def. 3) | `{users}` |
| GET | `/users/leaderboard` | A | `?limit=10\|20\|50\|100&period=all\|monthly` | `{users, rank, limit, myMonthlyScore?}` |
| GET | `/users/referrals` | A | `?period=all\|monthly` | `{referrers, myCount}` |
| PATCH | `/users/me` | A | `{displayName}` (≤30, bo'sh → null) | `{user}` |
| PATCH | `/users/me/language` | A | `{language: "uz-latn"\|"uz-cyrl"\|"ru"}` | `{ok, language, stored}` |
| POST | `/users/me/check-achievements` | A (10/min) | — | `{newlyUnlocked, totalBonus, user}` |
| POST | `/users/bot-start` | A | `{telegramId, firstName, lastName?, username?}` | `{isNew, totalCount}` |

> Mehmon (`telegram_id<=0`): `PATCH /users/me` → `403`; `PATCH /users/me/language` → `200 {stored: false}` (DB'ga yozilmaydi).

### 11.4 Savollar — `/api/questions/`

| Metod | Yo'l | Auth | Parametr | Javob |
|---|---|---|---|---|
| GET | `/questions/round` | A + premium limit `round` | `?count=1..20&category=&difficulty=` | `{questions: [{id, text, category, difficulty, options[], timeLimitSeconds}]}` |
| GET | `/questions/categories` | A | — | `{categories: [str]}` |
| POST | `/questions/<id>/report` | A (10/soat) | — | `{ok}` `201` |
| GET | `/questions/reported` | AD | — | `{questions: [...+reportCount]}` |
| DELETE | `/questions/<id>` | AD | — | `{ok}` |

### 11.5 Javoblar — `/api/answer/`

| Metod | Yo'l | Auth | Body | Javob |
|---|---|---|---|---|
| POST | `/answer/ticket` | A (60/min) | `{questionId}` (UUID) | `{ticket}` |
| POST | `/answer` | A (60/min) | `{ticket, userAnswer, betAmount?}` | `{status, isCorrect, explanation, correctAnswer, pointsEarned, streak, betAmount, betWon}` |
| POST | `/answer/tts` | A (30/min) | `{text}` (≤600) | `{audio, mimeType: "audio/wav"}` |
| POST | `/answer/reveal` | A (20/min) | `{ticket}` | `{correctAnswer, explanation}` |

**Xatolar:** `400` noto'g'ri bilet/imzo · `404` savol topilmadi · `409` bilet allaqachon ishlatilgan · `503` TTS mavjud emas

### 11.6 O'yin natijalari — `/api/game-results/`

| Metod | Yo'l | Auth | Body / Parametr | Javob |
|---|---|---|---|---|
| POST | `/game-results` | A (20/soat, 100/kun) | `{correctCount, totalCount, roundScore}` | `{ok}` `201` |
| GET | `/game-results/stats` | A | — | `{stats: {gamesPlayed, accuracy, bestRoundScore, totalCorrect}}` |
| GET | `/game-results/history` | A | `?limit=1..50` (def. 20) | `{results: [...]}` |

### 11.7 Kunlik topshiriq — `/api/daily/`

| Metod | Yo'l | Auth | Javob |
|---|---|---|---|
| GET | `/daily/today` | A + premium limit `daily` | `{date, questions, completed, streak:{current,longest}, bonusPreview}` |
| POST | `/daily/complete` | A | `{newStreak, longestStreak, streakBonus}` `201` |

### 11.8 Jamoalar — `/api/teams/`

| Metod | Yo'l | Auth | Body | Javob |
|---|---|---|---|---|
| POST | `/teams` | A (10/min) | `{name}` (2–30) | `{team, code}` `201` |
| POST | `/teams/join` | A (20/min) | `{code}` (4–8) | `{team, members}` |
| GET | `/teams/my` | A | — | `{team \| null}` |
| PATCH | `/teams/my/rename` | A (10/min) | `{name}` | `{team}` |
| POST | `/teams/my/transfer-owner` | A (10/min) | `{newOwnerTelegramId}` | `{team}` |
| GET | `/teams/my/chat` | A | — | `{messages}` (oxirgi 50) |
| POST | `/teams/my/chat/send` | A (20/min) | `{text}` (≤500) | `{message}` `201` |
| DELETE | `/teams/leave` | A (20/min) | — | `{ok}` |

### 11.9 Bellashuv — `/api/battles/`

| Metod | Yo'l | Auth | Body | Javob |
|---|---|---|---|---|
| GET | `/battles/pending` | A | — | `{challenges: [...]}` |
| POST | `/battles/challenge` | A + premium `battle` (10/min IP) | `{opponent_code}` | `{battleId}` `201` |
| POST | `/battles/<id>/accept` | A | — | `{ok, battleId}` |
| POST | `/battles/<id>/decline` | A | — | `{ok}` |
| POST | `/battles/<id>/cancel` | A | — | `{ok}` |
| POST | `/battles/<id>/answer` | A | `{roundId, answer}` | `{isCorrect, correctAnswer}` |
| GET | `/battles/<id>/state` | A | — | To'liq o'yin holati (quyida) |
| POST | `/battles/<id>/forfeit` | A | — | `{ok}` |

**`/state` javob strukturasi:**
```jsonc
{
  "battleId": "uuid",
  "status": "pending|in_progress|finished",
  "challengerTeam": { "id", "name", "score", "ownerId",
                      "members": [{telegramId, firstName, username,
                                   answeredCurrentRound, isCaptain}] },
  "opponentTeam":   { ... },
  "myTeamId": "uuid|null",
  "isCaptain": true,
  "currentRound": {
    "roundId", "roundNumber", "totalRounds",
    "questionText", "options": [...],
    "correctAnswer": null,          // faqat javob berilgach yoki vaqt tugagach
    "timeLimitSeconds": 60, "timeRemainingMs": 45000,
    "myAnswered": false,
    "challengerTeamAnswered": false, "opponentTeamAnswered": false
  },
  "finished": false,
  "winnerTeamId": null
}
```

### 11.10 Svoyak — `/api/svoyak/`

**Public / o'yinchi:**

| Metod | Yo'l | Auth | Body | Javob |
|---|---|---|---|---|
| GET | `/svoyak/categories` | A | — | `{items: [{id, name, iconEmoji, language, questionCount, ready}]}` |
| POST | `/svoyak/rooms` | A | `{displayName?, categoryIds?[], categoryId?, settings?}` | Xona holati `201` |
| POST | `/svoyak/rooms/<code>/join` | A | `{displayName, role?}` | Xona holati |
| DELETE | `/svoyak/rooms/<code>/leave` | A | — | `{ok}` |
| GET | `/svoyak/rooms/<code>/state` | A | — | Xona holati (500 ms polling) |
| POST | `/svoyak/rooms/<code>/start` | A (host) | — | Xona holati |
| POST | `/svoyak/rooms/<code>/pick` | A | `{categoryId, valueTier}` | Xona holati |
| POST | `/svoyak/rooms/<code>/open-buzz` | A (host/koordinator) | — | Xona holati |
| POST | `/svoyak/rooms/<code>/buzz` | A (60/min) | — | Xona holati |
| POST | `/svoyak/rooms/<code>/answer` | A (buzz g'olibi) | `{answer}` | Xona holati |
| POST | `/svoyak/rooms/<code>/skip` | A | — | Xona holati |
| POST | `/svoyak/rooms/<code>/end` | A (host) | — | Xona holati |
| POST | `/svoyak/rooms/<code>/auto-answer` | A (60/min) | `{answer}` | Xona holati |

**Admin CRUD:**

| Metod | Yo'l | Auth |
|---|---|---|
| POST | `/svoyak/admin/seed` | AD |
| GET, POST | `/svoyak/admin/categories` | AD |
| PATCH, DELETE | `/svoyak/admin/categories/<id>` | AD |
| GET, POST | `/svoyak/admin/questions` | AD |
| PATCH, DELETE | `/svoyak/admin/questions/<id>` | AD |

**Xona holati (`state`) strukturasi:**
```jsonc
{
  "code": "ABC234", "status": "lobby|playing|paused|finished",
  "hostTelegramId": 123, "createdAt", "startedAt", "settings": {...},
  "isAutoMode": true,
  "selectedCategory": { "id", "name", "iconEmoji" },
  "autoState": {
    "questionIndex", "totalQuestions", "questionText",
    "correctAnswer": null,             // faqat vaqt tugagach yoki finished
    "phase": "reading|answering",
    "readingTimeRemainingMs", "timeRemainingMs", "startedAtMs",
    "attempts": [...],                 // raund ochiq bo'lsa boshqalarniki yashirin
    "myAttempt": {...}, "isPlaying": true
  },
  "players": [{telegramId, displayName, avatarUrl, score, status, role, canPick, isHost}],
  "board":   [{categoryId, categoryName, categoryIcon, order, usedValueTiers}],
  "currentRound": {
    "id", "questionId", "questionText", "questionType",
    "options": [...], "value", "status", "startedAt",
    "buzzWinnerTelegramId", "buzzWinnerAtMs", "isMyTurn",
    "answerCorrect": null, "correctAnswer": null, "scoreDelta": null
  },
  "viewerTelegramId": 123, "viewerIsHost": true
}
```

### 11.11 Online O'yin Xonasi — `/api/gamerooms/`

**Admin:**

| Metod | Yo'l | Auth | Body |
|---|---|---|---|
| GET | `/gamerooms/admin/rooms` | A | — (o'z xonalari) |
| POST | `/gamerooms/admin/rooms` | AD + premium `gameroom` | `{name, joinPassword?, extraAdminIds?}` |
| POST | `/gamerooms/admin/rooms/<code>/start` | RA | — |
| POST | `/gamerooms/admin/rooms/<code>/finish` | RA | — |
| POST | `/gamerooms/admin/rooms/<code>/questions` | RA | `{questionType, body, mediaRef?, caption?, correctAnswer?, timeLimitSeconds?, pointValue?, isBonus?, isQuick?}` |
| POST | `.../questions/<qid>/close` | RA | — |
| PATCH | `.../questions/<qid>/correct-answer` | RA | `{correctAnswer}` |
| POST | `.../questions/<qid>/cancel` | RA | — |
| POST | `.../questions/<qid>/auto-grade` | RA | — |
| PATCH | `.../submissions/<sid>/grade` | RA | `{isCorrect}` |
| GET | `.../questions/<qid>/submissions` | RA | — |
| GET | `.../questions/<qid>/submissions/grouped` | RA | — |
| POST | `.../questions/<qid>/bulk-grade` | RA | `{normalizedKey, isCorrect}` |
| POST | `.../questions/<qid>/grade-rest-wrong` | RA | — |
| GET | `/gamerooms/admin/rooms/<code>/stats` | RA | — |
| GET | `/gamerooms/admin/rooms/<code>/results` | RA | — |
| GET | `/gamerooms/admin/rooms/<code>/results.xlsx` | RA | → `.xlsx` fayl |
| POST | `/gamerooms/admin/rooms/<code>/save-to-bank` | RA | `{category?, difficulty?}` |

**Ishtirokchi:**

| Metod | Yo'l | Auth | Body |
|---|---|---|---|
| POST | `/gamerooms/rooms/<code>/join` | A | `{displayName, joinPassword?}` |
| GET | `/gamerooms/rooms/<code>/state` | A | `?adminView=1` (faqat xona admini uchun ta'sirli) |
| POST | `/gamerooms/rooms/<code>/answer` | A | `{questionId, answer}` |
| GET | `/gamerooms/rooms/<code>/leaderboard` | A | — |
| GET | `/gamerooms/rooms/<code>/questions/<qid>/media` | A | → fayl bytes |

### 11.12 Zakovat Stoli — `/api/zakovat-table/`

| Metod | Yo'l | Auth | Body |
|---|---|---|---|
| POST | `/zakovat-table/rooms` | **B** | — |
| GET | `/zakovat-table/admin/rooms` | **B** | — |
| GET | `/zakovat-table/rooms/<code>/state` | A | — (tma bo'lsa admin maydonlar yashirin) |
| POST | `/zakovat-table/rooms/<code>/join` | **B** | `{displayName}` |
| POST | `/zakovat-table/rooms/<code>/spectate` | **B** | — |
| POST | `/zakovat-table/admin/rooms/<code>/confirm-team` | **B** | — |
| POST | `/zakovat-table/admin/rooms/<code>/questions` | **B** | `{questions: [{text, answer}] × 12}` |
| POST | `/zakovat-table/admin/rooms/<code>/start` | **B** | — |
| POST | `/zakovat-table/admin/rooms/<code>/spin` | **B** | — |
| POST | `/zakovat-table/admin/rooms/<code>/verify` | **B** | `{isCorrect}` |
| POST | `/zakovat-table/rooms/<code>/advance-discussion` | **B** | — |
| POST | `/zakovat-table/rooms/<code>/answer` | **B** | `{answer, isVoice?}` |

### 11.13 Ustoz AI

**Public — `/api/ustoz/`:**

| Metod | Yo'l | Auth | Javob |
|---|---|---|---|
| GET | `/ustoz/subjects/` | A | `{items: [{id, name, iconEmoji, description, lessonCount}]}` |
| GET | `/ustoz/subjects/<id>/lessons/` | A | `{subject, items: [{id, name, description, questionCount}]}` |
| GET | `/ustoz/lessons/<id>/questions/` | A | `{lesson, items: [{id, text, optionA..optionD}]}` |
| POST | `/ustoz/questions/<id>/check/` | A | `{correct, correctOption, explanation}` |

**Admin — `/api/admin/ustoz/`:**

| Metod | Yo'l | Auth |
|---|---|---|
| GET, POST | `/admin/ustoz/subjects/` | AD |
| PATCH, DELETE | `/admin/ustoz/subjects/<pk>/` | AD |
| GET, POST | `/admin/ustoz/lessons/` (`?subjectId=`) | AD |
| PATCH, DELETE | `/admin/ustoz/lessons/<pk>/` | AD |
| GET, POST | `/admin/ustoz/questions/` (`?lessonId=`) | AD |
| PATCH, DELETE | `/admin/ustoz/questions/<pk>/` | AD |

### 11.14 Premium

**Public — `/api/premium/`:**

| Metod | Yo'l | Auth | Body |
|---|---|---|---|
| GET | `/premium/info` | A | — |
| POST | `/premium/request` | A | `multipart: receipt` (image/*, ≤10 MB) |
| GET | `/premium/history` | A | — |

**Admin — `/api/admin/premium/`:**

| Metod | Yo'l | Auth | Body |
|---|---|---|---|
| GET, PATCH | `/admin/premium/settings` | AD | `{enabled?, price?, currency?, durationDays?, benefits?, cardNumber?, cardHolder?, paymentDetails?, sectionLimits?}` |
| GET | `/admin/premium/users` (alias `/holders`) | AD | — |
| GET | `/admin/premium/analytics` | AD | — |
| GET | `/admin/premium/requests` | AD | `?status=` |
| GET | `/admin/premium/requests/<id>/receipt` | AD | → rasm bytes |
| POST | `/admin/premium/requests/<id>/approve` | AD | `{durationDays?}` (1–3650) |
| POST | `/admin/premium/requests/<id>/reject` | AD | `{reason?}` |
| POST | `/admin/users/<tid>/premium` | AD | qo'lda grant |
| DELETE | `/admin/users/<tid>/premium/revoke` | AD | qo'lda bekor qilish |

### 11.15 Muallif savollari

| Metod | Yo'l | Auth | Body |
|---|---|---|---|
| POST | `/api/author-questions` | A | `{questionText, answer, authorName}` |
| GET | `/api/admin/author-questions` | AD | `?status=&page=&limit=` (max 50) |
| POST | `/api/admin/author-questions/<id>/approve` | AD | — |
| POST | `/api/admin/author-questions/<id>/reject` | AD | `{reason?}` |

### 11.16 Kanallar — `/api/channels/`

| Metod | Yo'l | Auth | Javob |
|---|---|---|---|
| GET | `/channels/` | — | `{channels: [...]}` (faqat aktiv) |
| GET | `/channels/check` | A | `{allSubscribed, channels: [{id, channelId, channelTitle, channelUrl, subscribed}]}` |
| GET | `/channels/check/<telegram_id>` | AD (bot) | Xuddi shu format |

### 11.17 Admin API — `/api/admin/`

| Metod | Yo'l | Auth | Tavsif |
|---|---|---|---|
| GET, PATCH | `/admin/settings` | AD | Global `AppSettings` |
| GET | `/admin/stats` | AD | `{users, questions, categories, games, battles, teams}` |
| GET, POST | `/admin/questions` | AD | Ro'yxat (`?search&category&difficulty&page&limit≤50`) / yaratish |
| POST | `/admin/questions/bulk` | AD | `{questions: [...]}` — max **500** ta |
| PATCH, DELETE | `/admin/questions/<uuid>` | AD | Tahrirlash / o'chirish |
| GET | `/admin/categories` | AD | `{items: [{category, count}]}` |
| POST | `/admin/categories/rename` | AD | `{oldName, newName}` |
| GET | `/admin/users` | AD | `?search&page&limit≤50` |
| GET | `/admin/users/export` | AD | Barcha (max **10 000**) |
| GET | `/admin/users/ids` | AD | `{ids: [...], total}` — broadcast uchun |
| GET | `/admin/users/<tid>/profile` | AD | Profil + statistika + oxirgi 10 o'yin + referal |
| POST | `/admin/users/<tid>/message` | AD | `{text}` (≤4000) — bot orqali DM |
| GET, POST | `/admin/admins` | AD / **SA** (POST) | Ro'yxat / qo'shish |
| DELETE | `/admin/admins/<tid>` | **SA** | O'chirish |
| GET, POST | `/admin/channels` | AD | Barcha kanallar / qo'shish |
| DELETE, POST | `/admin/channels/<pk>` | AD | Soft-delete / qayta faollashtirish |
| GET, POST | `/admin/board` | AD | Xabar taxtasi (multipart) |
| DELETE | `/admin/board/<id>` | AD (muallif/SA) | O'chirish |
| GET | `/admin/board/<id>/media` | AD | Media proxy |

**Savol validatsiya qoidalari (`/admin/questions`):**

| Maydon | Qoida |
|---|---|
| `text` | ≥ 3 belgi |
| `correctAnswer` | ≥ 1 belgi |
| `difficulty` | `easy`\|`medium`\|`hard` yoki `null` |
| `wrongAnswers` | `null`/`[]` (erkin javob) **yoki aynan 3 ta** string, har biri 1–200 belgi, takrorlanmasin |
| `wrongAnswers` ↔ `correctAnswer` | To'g'ri javob noto'g'ri variantlar orasida bo'lmasin |
| `timeLimitSeconds` | `null` yoki **5–120** |

---

## 12. TELEGRAM BOT

**Texnologiya:** grammY + tsx (TypeScript, kompilyatsiyasiz ishga tushadi)
**Fayllar:** `bot/src/bot.ts` (asosiy), `gameroom.ts`, `zakovatTable.ts`

### 12.1 Arxitektura

`bot.ts` markaziy fayl bo'lib, o'yin-xonasi va Zakovat-stoli modullariga **dependency bag** (`GrBotDeps`) uzatadi: `apiGet/Post/Patch/Delete`, `apiGetOnBehalf/...`, `isAdmin`, `getState/setState/clearState`, `ADMIN_KB`, `BACKEND_URL`, `ADMIN_API_KEY`, `BOT_USERNAME`.

### 12.2 Holat mashinasi (state machine)

- Holat xotirada: `Map<telegramId, {state, updatedAt}>`
- **TTL: 2 soat** (`STATE_TTL_MS`)
- Tozalash: har soatda eskirganlar o'chiriladi (xotira oqishining oldini oladi)
- **⚠️ Bot qayta ishga tushsa barcha holatlar yo'qoladi** (Redis/DB'da saqlanmaydi)

**Holat turlari (jami ~35 ta):**

| Guruh | Holatlar |
|---|---|
| Savol qo'shish | `add_text` → `add_answer` → `add_category` → `add_difficulty` |
| Savol tahrirlash | `edit_text`, `edit_answer` |
| PDF import | `await_pdf` → `confirm_pdf` |
| Reklama | `broadcast_text` → `broadcast_confirm` |
| Admin qo'shish | `add_admin_id` → `add_admin_note` |
| Kanal | `ch_add_username` |
| Ustoz AI — fan | `ustoz_fan_nomi` → `ustoz_fan_emoji` |
| Ustoz AI — dars | `ustoz_dars_fan_id` → `ustoz_dars_nomi` |
| Ustoz AI — savol | `ustoz_savol_dars_id` → `_matn` → `_a` → `_b` → `_c` → `_d` → `_togri` → `_izoh` |
| O'yin xonasi (`GrState`) | `gr_room_name` → `gr_room_password`; `gr_q_type` → `gr_q_body` → (`gr_q_audio`/`gr_q_photo` → `gr_q_caption`) → `gr_q_answer` → `gr_q_timer` → `gr_q_points`; `gr_correct_answer`, `gr_grading_v2`, `gr_join_code` → `gr_join_name` → `gr_join_password`, `gr_awaiting_answer`, `gr_cancel_q_confirm` |
| Zakovat Stoli (`ZtState`) | `zt_q_text` ⇄ `zt_q_answer` (12 marta), `zt_join_code`, `zt_spectate_code`, `zt_awaiting_captain_answer` |

### 12.3 Buyruqlar

| Buyruq | Kim | Vazifa |
|---|---|---|
| `/start` | Hamma | Kanal obunasini tekshiradi → xush kelibsiz + Mini App tugmasi |
| `/start room_<CODE>` | Hamma | Deep-link: O'yin xonasiga to'g'ridan-to'g'ri qo'shilish |
| `/admin` | Admin | Admin klaviaturasini ochadi (admin emas → o'z ID'sini ko'rsatadi) |
| `/myid` | Hamma | Telegram ID va admin holatini ko'rsatadi |
| `/cancel` | Hamma | Joriy holatni bekor qiladi |
| `/skip` | Hamma | Oqimdagi ixtiyoriy qadamni o'tkazib yuboradi |

### 12.4 Xush kelibsiz ekrani

Inline tugmalar:
1. **🚀 Zakovat O'yinini Ochish** — `web_app` (faqat `MINI_APP_URL` sozlangan bo'lsa; aks holda "⚠️ O'yin hozircha mavjud emas")
2. **🎮 Xonaga kirish (kod bilan)** — `gr:join_manual`
3. **🔴 Interaktiv Zakovat Stoli** — `zt:menu`

Admin bo'lsa qo'shimcha `ADMIN_KB` reply-klaviatura yuboriladi.

### 12.5 Admin klaviaturasi (`ADMIN_KB`)

```
📋 Savollar          ➕ Qo'shish
📄 PDF yuklash       📊 Statistika
👥 Foydalanuvchilar  📢 Reklama
👨‍💼 Adminlar         📢 Majburiy kanallar
🎮 O'yin xonasi      🔴 Zakovat Stoli
🎓 Ustoz AI
🏠 Asosiy menyu
```

| Tugma | Funksiya |
|---|---|
| 📋 Savollar | Sahifalangan ro'yxat (5 ta/sahifa), har savolda ✏️ tahrirlash / 🗑️ o'chirish |
| ➕ Qo'shish | Savol → javob → kategoriya → qiyinlik oqimi |
| 📄 PDF yuklash | PDF hujjat → parse → tasdiqlash → bulk import |
| 📊 Statistika | `/api/admin/stats` |
| 👥 Foydalanuvchilar | Sahifalangan ro'yxat (10 ta/sahifa) + 📥 CSV eksport |
| 📢 Reklama | Matn → tasdiq → barcha foydalanuvchilarga broadcast |
| 👨‍💼 Adminlar | Ro'yxat, qo'shish (ID + izoh), o'chirish |
| 📢 Majburiy kanallar | Ro'yxat, username orqali qo'shish, o'chirish/qayta yoqish |
| 🎮 O'yin xonasi | Xona yaratish, ro'yxat, savol push, baholash, eksport |
| 🔴 Zakovat Stoli | Xona yaratish, 12 savol yuklash, spin, baholash |
| 🎓 Ustoz AI | Fan / Dars / Savol qo'shish va o'chirish |

### 12.6 PDF import (savol bazasini to'ldirish)

`parsePdfText()` uch bosqichli strategiya (birinchi ishlagani ishlatiladi):

1. **Markerli format:** `savol:` / `s:` / `question:` / `q:` … `javob:` / `j:` / `answer:` / `a:`
2. **Raqamlangan format:** `1. Savol matni` + keyingi qatorda `javob: ...`
3. **Paragraf formati:** bo'sh qator bilan ajratilgan blokda — 1-qator savol, 2-qator javob

| Cheklov | Qiymat |
|---|---|
| Parse timeout | `PDF_TIMEOUT_MS = 20 000` ms |
| Kutubxona | `pdf-parse` (`createRequire` orqali dinamik yuklanadi; topilmasa warning) |

### 12.7 Reklama (broadcast)

| Parametr | Qiymat |
|---|---|
| `BROADCAST_BATCH` | 25 xabar/partiya |
| `BROADCAST_DELAY_MS` | 1100 ms partiyalar orasida |
| Format | `parse_mode: "Markdown"` |
| Progress | Har 10 partiyada admin xabari yangilanadi |
| Manba | `GET /api/admin/users/ids` |

Telegram flood-limit'iga tushmaslik uchun bu tempda yuboriladi.

### 12.8 Kanal obunasi tekshiruvi

- Bot backend'ga murojaat qiladi: `GET /api/channels/check/<userId>` (bir xil `getChatMember` mantig'i takrorlanmasin)
- Kesh: `CHANNELS_CACHE_TTL_MS = 5 daqiqa`
- Xato bo'lsa → `allSubscribed: false` va keshdagi kanallar ko'rsatiladi (fail-closed)
- "✅ Tekshirish" tugmasi (`check_sub` callback) qayta tekshiradi
- **Adminlar tekshiruvdan ozod**

### 12.9 Barqarorlik

| Chora | Amalga oshirilishi |
|---|---|
| **Graceful shutdown** | `SIGTERM` / `SIGINT` → `bot.stop()` |
| **Qayta ulanish** | `startBot(attemptsLeft = 5)` — 5 marta urinish |
| **`MINI_APP_URL` HTTPS tekshiruvi** | `https://` bilan boshlanmasa `web_app` tugmasi qo'yilmaydi |
| **Xato handleri** | `bot.catch(...)` — bot yiqilmaydi |
| **Markdown escape** | `md()` funksiyasi `\ _ * [ ] ( ) \`` belgilarini himoyalaydi |

---

## 13. FRONTEND (MINI APP)

### 13.1 Ekranlar (`Screen` turi)

| Ekran | Komponent | Tavsif |
|---|---|---|
| `loading` | (App ichida) | Splash — **kamida 1500 ms** (`SPLASH_MIN_MS`) brending uchun |
| `name` | `NameEntryScreen` | Ism so'rash (faqat zarur bo'lganda) |
| `home` | `HomeScreen` | Bosh sahifa: qiyinlik tanlash + qo'shimcha rejimlar |
| `question` | `QuestionCard` | Savol + taymer + javob (himoyalangan ekran) |
| `result` | `ResultCard` / `ResultScreen` | Javob natijasi (avto o'tish: 2000 ms, partial 2500 ms) |
| `finish` | `FinishScreen` | Raund yakuni + ulashish |
| `team` | `TeamScreen` | Jamoa: yaratish/qo'shilish/chat/bellashuv |
| `battle` | `BattlePage` | Bellashuv jarayoni (2 s polling) |
| `leaderboard` | `LeaderboardScreen` | Reyting (umumiy/oylik/taklif) |
| `profile` | `ProfileScreen` | Profil, statistika, yutuqlar, til, diagnostika |
| `svoyak` | `SvoyakRouter` | Svoyak (lobby → board/auto → finished) |
| `gameroom` | `GameRoomRouter` | O'yin xonasi (join → play) |
| `zakovatTable` | `ZakovatTableRouter` | Zakovat Stoli kuzatuvi (watch → spectate) |
| `daily` | `DailyChallengeScreen` | Kunlik topshiriq |
| `premium` | `PremiumScreen` | Premium: narx, karta, chek yuklash, tarix |
| `admin` | `AdminPanel` | To'liq admin paneli |
| `ustozoAi` | `UstozoAiScreen` | Fanlar ro'yxati |
| `ustozoLessons` | `UstozoLessonsScreen` | Darslar ro'yxati |
| `ustozoQuiz` | `UstozoQuizScreen` | Test (15 s taymer, ball, ovoz) |

### 13.2 Pastki navigatsiya (`BottomNav`)

```
[🏠 Asosiy]  [🏆 Reyting]   ((SVOYAK))   [👥 Jamoa]  [👤 Profil]
                          markazda alohida
```

`showAdmin` bo'lsa qo'shimcha 🛡 Admin tugmasi. `NAV_SCREENS = [home, finish, team, profile, leaderboard, svoyak]` — faqat shu ekranlarda ko'rinadi.

### 13.3 Bootstrap ketma-ketligi (`App.tsx`)

```
1. useTelegram() → initData, startParam, telegramUser, inTelegram, initDataMissing
2. initDataMissing (Telegramda, lekin imzo yo'q) → login CHAQIRILMAYDI
3. Onboarding tugamagan bo'lsa → OnboardingScreen (til tanlash) — login kutadi
4. bootstrapDoneRef — bir martagina ishga tushadi
5. startParam parse:
      join_<CODE>    → jamoaga avtomatik qo'shilish
      svoyak_<CODE>  → Svoyak xonasiga
      room_<CODE>    → O'yin xonasiga
      <raqam>        → referrerId
6. POST /api/auth/login  (to'liq await qilinadi)
7. AUTH DESYNC tekshiruvi:
      Telegram user.id > 0  AMMO  backend telegramId == 0
      → authBroken = true, ilova davom etmaydi
8. Til sinxronizatsiyasi (client ↔ server)
9. Top foydalanuvchilar yuklanadi (await)
10. Fon rejimida: dailyInfo, premiumInfo
11. Kanal obunasi tekshiriladi (AWAIT — bloklaydi)
12. Splash qolgan vaqti kutiladi (SPLASH_MIN_MS)
13. Ekran tanlanadi:
       isAdminRoute && response.isAdmin  → admin
       joinCode                          → team
       svoyakMatch / roomMatch           → svoyak / gameroom  (ism kerak bo'lsa → name)
       aks holda                         → home / name
```

**⚠️ Xavfsizlik:** `/admin` URL yo'li **o'zi admin huquqi bermaydi** — faqat `response.isAdmin === true` bo'lsa panel ochiladi. Login xato bo'lsa hech qachon admin ekraniga o'tilmaydi.

### 13.4 Ism ko'rsatish mantig'i

`pickDisplayName()` prioriteti:
1. `user.displayName` (foydalanuvchi o'zi qo'ygan)
2. Telegram `first_name + last_name`
3. DB'dagi `firstName + lastName`
4. `username`
5. Bo'sh string

**Ism so'rash ekrani (`name`) qachon ko'rsatiladi:**

| Holat | `needsName` |
|---|---|
| O'z `displayName` bor | `false` |
| Telegram ismi "toza" (`isCleanName`) | `false` |
| localStorage'da keshlangan ism bor | `false` |
| Yuqoridagilardan hech biri | `true` |
| Brauzer rejimi (Telegramsiz) | `!cachedName` |

`localStorage` kalitlari: `zakovat:playerName`, `zakovat:onboardingDone`.

### 13.5 Kontent himoyasi (`screen === "question"` bo'lganda)

| № | Chora |
|---|---|
| 1 | `document.body.classList.add("content-protected")` → CSS `user-select: none` |
| 2 | `contextmenu` bloklanadi (o'ng tugma / long-press) |
| 3 | `dragstart` bloklanadi |
| 4 | `selectstart` bloklanadi |
| 5 | `copy` bloklanadi (`preventDefault` + `stopPropagation`) |
| 6 | `Telegram.WebApp.disableVerticalSwipes()` — share gesture bloklanadi |

Ekrandan chiqilganda hammasi qaytariladi.

> **Eslatma:** Telegram Mini App'da skrinshotni **to'liq bloklash imkoni yo'q** — bu choralar faqat nusxalash va ulashishni qiyinlashtiradi.

### 13.6 API klienti (`src/api/client.ts`)

| Xususiyat | Amalga oshirilishi |
|---|---|
| Baza URL | `VITE_API_URL` + `/api`. Production build'da bo'lmasa **build fail** (`vite.config.ts`) |
| Auth sarlavhasi | `Authorization: tma ${window.Telegram.WebApp.initData \|\| "guest"}` |
| Dev bypass | `localStorage["svoyak:devTid"]` raqam bo'lsa → `X-Dev-Tid` sarlavhasi qo'shiladi |
| `request<T>()` | Xatoda `null` qaytaradi + `console.error` |
| `requestResult<T>()` | `{ok: true, data}` yoki `{ok: false, error: "<backend message>"}` |
| Fallback | `login()` xato bo'lsa `FALLBACK_AUTH` (bo'sh mehmon) |
| `normalizeQuestion()` | `options` ni string massivga tozalaydi (defensive) |

### 13.7 Ko'p tillilik (i18n)

| Til | Kod | Yorliq |
|---|---|---|
| O'zbek (lotin) | `uz-latn` | 🇺🇿 O'zbek (Lat) — **default** |
| Ўзбек (кирилл) | `uz-cyrl` | 🇺🇿 Ўзбек (Кр) |
| Русский | `ru` | 🇷🇺 Русский |

- Matnlar: `src/i18n/strings.ts` (986 qator), tip `Record<Lang, string>` — **yangi kalit 3 tilga ham majburiy**
- Kontekst: `LanguageContext.tsx`, hook: `useT()`
- Saqlash: `localStorage` (offline uchun) + `users.language` (qurilmalararo sinxron)
- Sinxronizatsiya qoidasi: client `uz-latn` (default) va server boshqacha bo'lsa → **server'dan pull**; client default'dan boshqa bo'lsa → **server'ga push**

### 13.8 Hooklar

| Hook | Vazifasi |
|---|---|
| `useTelegram()` | WebApp init, `initData`, `startParam`, platform aniqlash, **broken-auth** aniqlash, debug ma'lumotlari |
| `useTimer()` | Savol taymeri |
| `useGameSounds()` | To'g'ri/noto'g'ri javob ovozlari |
| `useAppSettings()` | Global `AppSettings` (qiyinlik tugmalari, TTS, koordinator, chat) |
| `useSvoyakRoom()` | Svoyak holati polling (500 ms) |
| `useGameRoom()` | O'yin xonasi holati polling |
| `useZakovatTableRoom()` | Zakovat Stoli holati polling |
| `useTTS()` | Ovozli o'qish boshqaruvi |
| `useAuthedMedia()` | Auth sarlavhasi bilan media yuklash (blob URL) |

### 13.9 `useTelegram` — auth holatlarini aniqlash

| Holat | Belgi | `initData` qiymati |
|---|---|---|
| **Brauzer** (SDK yo'q) | `webApp.ready` yo'q | `"guest"` |
| **Telegramda, imzo bor** | `platform` haqiqiy VA `initData` mavjud | haqiqiy `initData` |
| **Telegramda, imzo YO'Q** | `initDataUnsafe.user.id` bor, `initData` bo'sh | `""` va `initDataMissing = true` |

**⚠️ Uchinchi holat kritik:** bunda `"guest"` yuborilsa backend foydalanuvchini mehmon deb belgilab qo'yadi (jamoa leak / spam). Shuning uchun login **umuman chaqirilmaydi**.

### 13.10 Ulashish (`utils/share.ts`)

| Funksiya | Havola |
|---|---|
| `buildTeamInviteShare` | `https://t.me/<bot>?startapp=join_<CODE>` |
| `buildBattleInviteShare` | `https://t.me/<bot>?startapp=team` |
| `buildRoundShare` | `https://t.me/<bot>` + natija matni |
| `buildInviteShare` | `https://t.me/<bot>?startapp=<referrerId>` |

Bot username: `VITE_BOT_USERNAME` (default `zakovot_robot`).
Ochish: `Telegram.WebApp.openLink()` → aks holda `window.open`.

### 13.11 Fayldan savol import qilish (`utils/questionFileParser.ts`)

**Qo'llab-quvvatlanadigan formatlar:** `.json`, `.csv`, `.tsv`, `.txt`, `.xls`, `.xlsx`, `.pdf`

**Majburiy maydonlar:** `text`, `correctAnswer` · **Ixtiyoriy:** `category`, `difficulty`

**Tanib olinadigan ustun nomlari (ko'p tilli):**

| Maydon | Muqobil nomlar |
|---|---|
| Savol | `text`, `savol`, `savol_matni`, `question`, `q` |
| Javob | `correctanswer`, `correct_answer`, `answer`, `javob`, `javobi`, `togri_javob`, `to'g'ri_javob`, `a` |
| Kategoriya | `category`, `kategoriya`, `fan`, `mavzu` |
| Qiyinlik | `difficulty`, `qiyinlik`, `level`, `daraja` |

**Qiyinlik qiymatlari:** `easy`/`oson`, `medium`/`o'rta`/`orta`, `hard`/`qiyin`

Natija: `{format, valid: ParsedQuestion[], invalid: [{row, reason}]}` — noto'g'ri qatorlar alohida ko'rsatiladi.

---
## 14. ADMIN PANEL

Ikki xil admin interfeysi mavjud:

| Interfeys | Manzil | Kim uchun |
|---|---|---|
| **Mini App admin paneli** | Mini App ichida (`screen === "admin"`) yoki `/admin` yo'li | Kundalik boshqaruv |
| **Django admin** | `/<ADMIN_SECRET_PATH>/` | Texnik/favqulodda holatlar |
| **Bot admin menyusi** | Telegram bot | Tezkor amallar (savol, reklama, xonalar) |

### 14.1 Mini App admin paneli — bo'limlar

**Fayl:** `frontend/src/components/AdminPanel.tsx` (5226 qator) + `components/admin/*`

| ID | Nomi | Rang | Vazifasi |
|---|---|---|---|
| `dashboard` | Dashboard | `#4DA6FF` | Tizim ko'rsatkichlari: foydalanuvchi, savol, o'yin, bellashuv, jamoa soni + kategoriyalar statistikasi |
| `questions` | Savolar | `#22C55E` | CRUD, qidiruv, filtr, sahifalash, **fayldan bulk import** (JSON/CSV/TSV/TXT/XLS/XLSX/PDF), A/B/C/D variantlari, vaqt limiti |
| `reports` | Shikoyatlar | `#EF4444` | Shikoyat tushgan savollar (`reportCount` bilan), moderatsiya |
| `categories` | Kategoriyalar | `#A78BFA` | Ro'yxat + savol soni, **qayta nomlash** (bir vaqtda barcha savollarda) |
| `svoyak` | Svoyak | — | Kategoriya va savollar CRUD, seed, `time_seconds` sozlash |
| `channels` | Kanallar | — | Majburiy kanallar: qo'shish (username orqali), soft-delete, qayta yoqish, `passedCount` |
| `users` | Foydalanuvchilar | — | Ro'yxat, qidiruv, profil, statistika, **bot orqali DM yuborish**, premium grant/revoke, CSV eksport |
| `settings` | Sozlamalar | — | Global `AppSettings` (chat, TTS, qiyinlik, koordinator, Svoyak vaqti) |
| `board` | Xabar taxtasi | — | Adminlar uchun ichki e'lonlar (matn + rasm/video) |
| `premium` | Premium | — | 4 ta tab: **Kutilmoqda** / **Egalar** / **Analitika** / **Sozlamalar** |
| `author_questions` | Muallif savollari | — | 3 ta tab: **Kutilmoqda** / **Tasdiqlangan** / **Rad etilgan** |

### 14.2 Premium bo'limi tablari

| Tab | Mazmuni |
|---|---|
| **pending** | Kutilayotgan to'lov so'rovlari, chek rasmi, tasdiqlash (muddat bilan) / rad etish (sabab bilan) |
| **holders** | Aktiv premium foydalanuvchilar: kim, kim bergan, qachongacha |
| **analytics** | Premium tizimi bo'yicha statistika |
| **settings** | `enabled`, narx, valyuta, muddat, imtiyozlar matni, karta raqami/egasi, to'lov izohi, bo'lim limitlari |

### 14.3 Django admin (`ModelAdmin` ro'yxatdan o'tganlar)

`battles`, `game_results`, `gamerooms`, `questions`, `svoyak`, `teams`, `users`, `ustoz_ai`, `zakovat_table`.

**⚠️ Django admin faqat favqulodda holatlar uchun.** Kundalik ish — Mini App paneli yoki bot orqali (biznes qoidalari `repositories` qatlamida, Django admin ularni chetlab o'tadi).

### 14.4 Management buyruqlari

| Buyruq | Vazifasi |
|---|---|
| `python manage.py show_admin_url` | Django admin yashirin URL'ini ko'rsatadi |
| `python manage.py seed_svoyak [--force]` | 6 kategoriya × 5 ball × 3 variant = **90 ta** demo Svoyak savoli |
| `python manage.py seed_questions` | Asosiy savol bazasi seed |
| `python manage.py seed_demo_questions` | Demo savollar |
| `python manage.py clear_guest_team` | Mehmon (`telegram_id=0`) jamoasini tozalash |
| `python manage.py clear_guest_name` | Mehmon `display_name` ini tozalash |
| `python manage.py createcachetable` | `django_cache_table` yaratish (**birinchi deploy'dan oldin MAJBURIY**) |

---

## 15. XAVFSIZLIK TALABLARI

### 15.1 Javob biletlari (replay attack himoyasi)

**Fayl:** `apps/answers/tickets.py`

**Format:** `base64url("<questionId>.<issuedAtMs>.<jti>.<HMAC-SHA256>")`

| Element | Tavsif |
|---|---|
| `questionId` | Savol UUID'si |
| `issuedAtMs` | Chiqarilgan vaqt (unix ms) — vaqt tekshiruvi uchun |
| `jti` | `uuid4().hex` — **har biletga noyob** |
| HMAC | `TICKET_HMAC_SECRET` bilan imzo (bot tokenidan **alohida**) |

**Consume mantig'i:**
```python
cache.add(f"used_ticket:{jti}", "1", timeout=180)   # atomik
# True qaytarsa → bilet endi ishlatildi
# False → allaqachon ishlatilgan → 409
```

| № | Talab |
|---|---|
| S-1.1 | `TICKET_HMAC_SECRET` bo'sh bo'lsa imzolash **`RuntimeError`** bilan to'xtaydi (zaif HMAC ishlatilmaydi) |
| S-1.2 | Sozlanmagan bo'lsa `SECRET_KEY` dan derived hash ishlatiladi + production'da warning |
| S-1.3 | `CONSUMED_TTL_SECONDS = 180` (max savol vaqti 120 s + grace) |
| S-1.4 | **⚠️ Ko'p worker'da atomik ishlashi uchun Redis kerak.** `REDIS_URL` yo'q bo'lsa startup'da warning yoziladi |
| S-1.5 | Savol mavjudligi consume'dan **oldin** tekshiriladi (o'chirilgan savol uchun bilet sarf bo'lmasin) |
| S-1.6 | `reveal` ham biletni consume qiladi (Gemini kvotasi himoyasi) |

### 15.2 Ma'lumot sizib chiqishining oldini olish (leak prevention)

| Kontekst | Qoida |
|---|---|
| **Savol ro'yxati** | `correctAnswer` va `wrongAnswers` **yuborilmaydi** — faqat aralashtirilgan `options` |
| **Ustoz AI** | `correctOption` savollar ro'yxatida yuborilmaydi |
| **Bellashuv** | `correctAnswer` faqat javob berilgach yoki vaqt tugagach |
| **Svoyak klassik** | `correctAnswer` faqat raund `completed`/`skipped` bo'lganda |
| **Svoyak auto** | Raund ochiq bo'lsa boshqa o'yinchilarning javob matni va `isCorrect` **yashiriladi** |
| **O'yin xonasi** | Savol ochiq bo'lsa: `correctAnswer` faqat adminga; ishtirokchi o'z `isCorrect`/`pointsAwarded` ini ham ko'rmaydi; boshqalarning javoblari yopiq |
| **Zakovat Stoli** | `tma` auth bilan kelgan so'rovda to'g'ri javob va kapitan javobi **hech qachon** qaytarilmaydi |
| **`whoami`** | `allowedHosts` faqat super-adminlarga |
| **Loglar** | Telegram ID'lar PII sifatida qaraladi; hash'lar faqat oxirgi 8 belgisi loglanadi |

### 15.3 Race condition himoyasi

| Joy | Chora |
|---|---|
| Jamoaga qo'shilish | `select_for_update` + a'zolar sonini lock ostida tekshirish |
| Jamoadan chiqish | `select_for_update` (a'zo + jamoa) — ikki bir vaqtdagi chiqishda ham to'g'ri ishlaydi |
| Sardorlikni o'tkazish | `select_for_update` bilan a'zolik qayta tasdiqlanadi |
| Bellashuv | 5 ta atomik "gate" funksiyasi (`try_*`) |
| Svoyak barcha amallari | `SvoyakRoom.objects.select_for_update()` |
| O'yin xonasi | `GameRoom` + `GameQuestion` + `Participant` + `Submission` lock |
| Baholash | `filter(id=..., graded_by="").update(...)` — birinchi yozuvchi g'olib |
| Milestone | `MilestoneState` `select_for_update` |
| Premium approve | `User.objects.select_for_update()` + idempotentlik tekshiruvi |
| Ball yechish | `filter(score__gte=amount).update(score=F("score") - amount)` |
| Jamoa kodi kolliziyasi | `IntegrityError` → 8 marta qayta urinish |

### 15.4 Kirish ma'lumotlari validatsiyasi

| Maydon | Chegara |
|---|---|
| `displayName` | ≤ 30 belgi |
| Jamoa nomi | 2–30 belgi |
| Jamoa kodi | 4–8 belgi |
| Chat xabari | ≤ 500 belgi |
| Savol matni (admin) | ≥ 3 belgi |
| Savol matni (xona) | ≤ 2000 belgi |
| Javob (xona) | ≤ 500 belgi |
| `wrongAnswers` element | 1–200 belgi, aynan 3 ta, takrorlanmasin |
| `timeLimitSeconds` | 5–120 |
| Xona nomi | ≤ 200 belgi |
| Xona paroli | ≤ 50 belgi |
| Taxallus | ≤ 120 belgi |
| Admin DM matni | ≤ 4000 belgi |
| Muallif savoli | ≤ 2000, javob ≤ 500, ism ≤ 100 |
| Bulk import | ≤ 500 savol |
| Users eksport | ≤ 10 000 yozuv |
| Chek rasmi | `image/*`, ≤ 10 MB |
| Board rasm / video | ≤ 10 MB / ≤ 50 MB |
| UUID maydonlari | Regex bilan tekshiriladi |
| Kanal username | `^[A-Za-z0-9_]{4,}$` |

### 15.5 HTTPS va CORS (production)

```python
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000          # 1 yil
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
```

**CORS (production):** `FRONTEND_URL` + regex ruxsatlar:

| Platforma | Regex |
|---|---|
| Vercel | `^https://[\w-]+(\.[\w-]+)*\.vercel\.app$` |
| Netlify | `^https://[\w-]+(\.[\w-]+)*\.netlify\.app$` |
| Render | `^https://[\w-]+(\.[\w-]+)*\.onrender\.com$` |
| GitHub Pages | `^https://[\w-]+\.github\.io$` |
| Cloudflare Pages | `^https://[\w-]+\.pages\.dev$` |

`CORS_ALLOW_CREDENTIALS = True`, ruxsat berilgan sarlavha: `x-dev-tid`.
**Development'da:** `CORS_ALLOW_ALL_ORIGINS = True`.

### 15.6 Production'da majburiy tekshiruvlar (fail-fast)

`NODE_ENV=production` bo'lganda server **ko'tarilmaydi**, agar:

| Shart | Xato |
|---|---|
| `ALLOW_GUEST_AUTH=true` | `ImproperlyConfigured` |
| `ALLOW_DEV_TID=true` | `ImproperlyConfigured` |
| `DJANGO_SECRET_KEY` bo'sh | `ImproperlyConfigured` |

**Warning (ishlashda davom etadi):**
- `DJANGO_ALLOWED_HOSTS` o'rnatilmagan → `FRONTEND_URL` + `.onrender.com` dan derive qilinadi
- `TICKET_HMAC_SECRET` yo'q → `SECRET_KEY` dan derive qilinadi
- `FRONTEND_URL` yo'q → faqat regex CORS ishlaydi
- `REDIS_URL` yo'q → ticket replay xavfi (ko'p worker'da)
- `ADMIN_TELEGRAM_IDS` bo'sh → admin tugmasi hech kimga ko'rinmaydi

### 15.7 Kirish ma'lumotlarini tozalash — `ADMIN_TELEGRAM_IDS`

Render env'da tez-tez uchraydigan xatolar avtomatik tuzatiladi:
- Qo'shtirnoq: `"123"` → `123`
- Bo'sh joylar trim qilinadi
- Raqam bo'lmagan qiymat → warning + o'tkazib yuboriladi
- `<= 0` qiymat → rad etiladi

---

## 16. RATE LIMIT VA ANTI-CHEAT

### 16.1 Rate limitlar jadvali

| Endpoint | Limit | Kalit |
|---|---|---|
| `POST /api/auth/login` | 20/daqiqa | IP |
| `POST /api/answer/ticket` | 60/daqiqa | user yoki IP |
| `POST /api/answer` | 60/daqiqa | user yoki IP |
| `POST /api/answer/tts` | 30/daqiqa | user yoki IP |
| `POST /api/answer/reveal` | 20/daqiqa | user yoki IP |
| `POST /api/questions/<id>/report` | 10/soat | user yoki IP |
| `POST /api/teams` | 10/daqiqa | user yoki IP |
| `POST /api/teams/join` | 20/daqiqa | user yoki IP |
| `DELETE /api/teams/leave` | 20/daqiqa | user yoki IP |
| `POST /api/teams/my/chat/send` | 20/daqiqa | user yoki IP |
| `PATCH /api/teams/my/rename` | 10/daqiqa | user yoki IP |
| `POST /api/teams/my/transfer-owner` | 10/daqiqa | user yoki IP |
| `POST /api/battles/challenge` | 10/daqiqa | IP |
| `POST /api/svoyak/rooms/<code>/buzz` | 60/daqiqa | user yoki IP |
| `POST /api/svoyak/rooms/<code>/auto-answer` | 60/daqiqa | user yoki IP |
| `POST /api/users/me/check-achievements` | 10/daqiqa | user (qo'lda cache) |
| `POST /api/game-results` | 20/soat + 100/kun | user (qo'lda cache) |
| Django admin login | 5 urinish → 15 daqiqa blok | IP |

**`user_or_ip` kaliti** (`apps/core/ratelimit.py`): auth bo'lgan foydalanuvchi `u:<telegram_id>`, aks holda `ip:<REMOTE_ADDR>`. Sabab: mobil tarmoqda ko'p foydalanuvchi bitta IP'ni bo'lishishi va bir-birini bloklab qo'yishi mumkin.

### 16.2 Anti-cheat choralari

| Xavf | Chora |
|---|---|
| To'g'ri javobni sahifa manbasidan ko'rish | `correctAnswer` public javobda yo'q |
| "Har doim A" pattern | Crypto-shuffle (`secrets.randbelow`) |
| Bir savolga ko'p marta javob berib ball yig'ish | Bir martalik HMAC bilet + `jti` consume |
| Vaqtni cho'zib javob berish | Server-side vaqt tekshiruvi (bilet `issuedAtMs` dan) |
| Streak'ni kliyentdan soxtalashtirish | `streak_before` **DB'dan** o'qiladi |
| Ballni oshirib yuborish | Server-side cap: **max 3 ball/javob** |
| Soxta o'yin natijasi yuborish | `total ≤ 20`, `correct ≤ total`, `roundScore ≤ total×3` |
| Natija spam qilish | 20/soat, 100/kun |
| Yutuq bonusini takror olish | `unlocked_achievements` DB'da, 10/daqiqa limit |
| Manfiy ball tikish | `add_score` `amount > 0` talab qiladi |
| Yo'q ballni tikish | `deduct_score_if_sufficient` — atomik |
| Kunlik topshiriq natijasini soxtalashtirish | `correct_count` va `score` **DailyAnswer** dan hisoblanadi |
| Bellashuvda oldinda turib "chiqib ketish" | Forfeit → chiquvchi **doim** yutqazadi |
| Oddiy a'zoning jamoani yutqaztirishi | Forfeitni faqat sardor qila oladi |
| BUZZ vaqtini soxtalashtirish | Server `time.time()` ishlatadi |
| Svoyakda savol ochilmasdan BUZZ | `status == "reading"` → `409` |
| O'yin xonasida deadline'dan keyin javob | Server-authoritative `activated_at + limit + 2s` |
| Boshqalarning javobini ko'rib nusxalash | Raund ochiq bo'lganda javoblar yashirin |
| Savol shikoyatini spam qilish | `unique_together (question, reported_by)` + 10/soat |
| Muallif savoli spam | Max 3 ta `pending` |
| Premium so'rovi spam | Bitta `pending` so'rov |
| Prompt injection (Gemini) | System instruction ajratilgan + DATA bloki + sanitizatsiya |
| Skrinshot / nusxalash | Kontent himoyasi (6 qatlam) |

---

## 17. KONFIGURATSIYA (ENVIRONMENT)

### 17.1 Backend — `backend-django/.env`

| O'zgaruvchi | Majburiy | Default | Tavsif |
|---|---|---|---|
| `NODE_ENV` | Yo'q | `development` | `production` bo'lsa qattiq rejim |
| `DJANGO_SECRET_KEY` | **Ha (prod)** | dev'da avtogeneratsiya | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_DEBUG` | Yo'q | `false` | |
| `DJANGO_ALLOWED_HOSTS` | Tavsiya etiladi | derive | Vergul bilan |
| `FRONTEND_URL` | Tavsiya etiladi | `http://localhost:5173` | CORS + ALLOWED_HOSTS derive |
| `PORT` | Yo'q | `3000` | |
| `DATABASE_URL` | Yo'q | SQLite | Postgres uchun |
| `DATABASE_PATH` | Yo'q | `BASE_DIR/db.sqlite3` | SQLite yo'li |
| `REDIS_URL` | **Tavsiya etiladi** | DatabaseCache | Ticket atomikligi uchun |
| `TELEGRAM_BOT_TOKEN` | **Ha** | — | initData tekshirish + Telegram API |
| `BOT_INTERNAL_API_KEY` | **Ha (bot uchun)** | — | Bot ↔ backend. Bot tokeni **EMAS** |
| `TICKET_HMAC_SECRET` | Tavsiya etiladi | `SECRET_KEY` dan derive | Bilet imzosi |
| `GEMINI_API_KEY` | **Ha** | — | AI baholash va TTS |
| `GEMINI_MODEL` | Yo'q | `gemini-2.5-flash` | |
| `ADMIN_TELEGRAM_IDS` | **Ha** | `[]` | Super-adminlar (vergul bilan) |
| `MINI_APP_URL` | Tavsiya etiladi | `""` | Telegram xabaridagi tugma (HTTPS shart) |
| `ADMIN_MEDIA_CHAT_ID` | Yo'q | `""` | Board media saqlash chati |
| `ADMIN_SECRET_PATH` | Yo'q | `cp-<hash14>` | Django admin yashirin yo'li |
| `ADMIN_ALLOWED_IPS` | Yo'q | `[]` | IP whitelist |
| `ALLOW_GUEST_AUTH` | **Yo'q (dev)** | `false` | Prod'da → server ko'tarilmaydi |
| `ALLOW_DEV_TID` | **Yo'q (dev)** | `false` | Prod'da → server ko'tarilmaydi |

### 17.2 Frontend — `frontend/.env`

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `VITE_API_URL` | **Ha (build)** | Bo'lmasa `vite build` **xato bilan to'xtaydi** |
| `VITE_BOT_USERNAME` | Yo'q | Default `zakovot_robot` — ulashish havolalari uchun |

`frontend/.env.production` da hozir: `VITE_API_URL=https://zakovat-backend-euc8.onrender.com`

### 17.3 Bot — `bot/.env`

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Ha** | Backend'dagi bilan bir xil |
| `BACKEND_URL` | **Ha** | Backend manzili |
| `BOT_INTERNAL_API_KEY` | **Ha** | Backend'dagi bilan **AYNAN BIR XIL** |
| `ADMIN_TELEGRAM_IDS` | **Ha** | Super-adminlar |
| `ADMIN_ID` | Yo'q | Legacy (bitta ID) |
| `MINI_APP_URL` | **Ha** | HTTPS bo'lishi shart |

**`BOT_INTERNAL_API_KEY` yaratish:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 17.4 Lokal ishga tushirish

```bash
# 1. Paketlar
npm install                      # root (workspaces: frontend, bot)
cd backend-django
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Konfiguratsiya
cp .env.example .env             # backend
cp ../frontend/.env.example ../frontend/.env
cp ../bot/.env.example ../bot/.env
# .env fayllarni to'ldiring

# 3. Ma'lumotlar bazasi
python manage.py migrate
python manage.py createcachetable
python manage.py seed_svoyak     # ixtiyoriy: demo Svoyak savollari
python manage.py createsuperuser # ixtiyoriy: Django admin

# 4. Hammasini birga ko'tarish (root papkadan)
cd ..
npm run dev                      # backend:3000 + frontend:5173 + bot
```

**Alohida ishga tushirish:**
```bash
npm run dev:backend    # node scripts/run-django.js  (venv'ni avtomatik topadi)
npm run dev:frontend   # vite (5173)
npm run dev:bot        # tsx watch src/bot.ts
```

---

## 18. DEPLOY VA INFRATUZILMA

### 18.1 Render arxitekturasi

Loyiha **yagona Render servisi** sifatida ishlashi mumkin: Django backend WhiteNoise orqali React SPA'ni ham xizmat qiladi.

```
Render Web Service
├── Build Command:  bash backend-django/build.sh
└── Start Command:  Procfile'dan o'qiladi
```

### 18.2 `build.sh` bosqichlari

```bash
1. pip install -r requirements.txt          # backend paketlari
2. cd ../frontend && npm ci --no-audit      # frontend paketlari
3. rm -rf dist && npm run build             # Vite build (VITE_API_URL env'dan)
4. cd ../backend-django && collectstatic    # static fayllar
5. python manage.py createcachetable        # DatabaseCache jadvali (idempotent)
```

### 18.3 `Procfile` (start)

```
web: python manage.py migrate --noinput
     && python manage.py createcachetable
     && (python manage.py seed_svoyak || echo "WARNING: seed_svoyak muvaffaqiyatsiz")
     && gunicorn zakovat.wsgi:application --bind 0.0.0.0:$PORT --workers 2
        --access-logfile - --error-logfile - --log-level info
```

**⚠️ `seed_svoyak` xato bersa deploy to'xtamaydi** — faqat warning yoziladi.

### 18.4 SPA xizmat qilish (WhiteNoise)

```python
WHITENOISE_ROOT = BASE_DIR.parent / "frontend" / "dist"
WHITENOISE_INDEX_FILE = "index.html"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
```

**Keshlash siyosati (juda muhim):**

| Fayl turi | Cache-Control |
|---|---|
| `index.html` va `*.html` | `no-cache, no-store, must-revalidate` + `Pragma: no-cache` + `Expires: 0` |
| Hashlangan JS/CSS (`index-abc123.js`) | Uzoq muddatli kesh |

**Sabab:** `index.html` keshlansa foydalanuvchi eski Mini App versiyasini ko'rib qoladi. `index.html` hech qachon keshlanmaydi, u esa yangi hashlangan fayllarga ishora qiladi.

### 18.5 URL routing (catch-all)

```python
re_path(rf"^(?!api/|{_admin_path}/|health$|static/).*$", spa_fallback)
```

`api/`, admin yo'li, `health`, `static/` dan boshqa **barcha** yo'llar React SPA'ga yo'naltiriladi.

### 18.6 SQLite optimallashtirish

`apps/core/apps.py` — har DB ulanishida:
```sql
PRAGMA journal_mode = WAL;      -- concurrent yozish
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
```
`OPTIONS: {"timeout": 20}` — "database is locked" xatolarini kamaytiradi.

### 18.7 Deploy tekshiruv ro'yxati (checklist)

| № | Qadam |
|---|---|
| 1 | Barcha **maxfiy kalitlar yangilangan** (bot token, Gemini kalit, `SECRET_KEY`, `BOT_INTERNAL_API_KEY`) |
| 2 | `NODE_ENV=production`, `DJANGO_DEBUG=false` |
| 3 | `DJANGO_ALLOWED_HOSTS` aniq domain(lar) bilan to'ldirilgan |
| 4 | `ALLOW_GUEST_AUTH` va `ALLOW_DEV_TID` **env'da YO'Q** |
| 5 | `REDIS_URL` sozlangan (2+ worker uchun) |
| 6 | `python manage.py createcachetable` bajarilgan |
| 7 | `VITE_API_URL` build vaqtida to'g'ri qiymatda |
| 8 | Bot va backend'da `BOT_INTERNAL_API_KEY` **bir xil** |
| 9 | BotFather: `/setmenubutton` + `/setdomain` sozlangan |
| 10 | `GET /health` → `{"ok": true}` |
| 11 | Telegram'da `/start` → tugma paydo bo'ladi |
| 12 | Mini App ochiladi, kategoriyalar yuklanadi |
| 13 | 1 raund o'ynab ko'rilgan — ball saqlanadi |
| 14 | `GET /api/auth/whoami` bilan admin holati tekshirilgan |
| 15 | `python manage.py show_admin_url` bilan admin URL olingan va saqlangan |

### 18.8 BotFather sozlamalari

```
/setmenubutton
  @<bot_username>
  Mini App URL: https://sizning-domen.com
  Button text: Zakovat

/setdomain
  @<bot_username>
  sizning-domen.com
```

### 18.9 Loglar

```python
LOGGING = {
    "formatters": {"standard": {"format": "[{asctime}] {levelname} {name}: {message}"}},
    "root": {"level": "INFO" if IS_PRODUCTION else "DEBUG"},
    "loggers": {"django.utils.autoreload": {"level": "WARNING"}},
}
```

**Kuzatiladigan strukturali hodisalar (`extra={"event": ...}`):**
`question_reported`, `question_deleted`, `team_created`, `team_joined`, `team_left`, `team_renamed`, `team_owner_transferred`, `user_language_changed`, `app_settings_updated`, `admin_added` (WARNING), `admin_removed` (WARNING), `admin_sent_message`, `required_channel_added`, `channel_deactivated`, `premium_request_created`, `premium_request_approved`, `author_question_submitted`, `author_question_approved`, `author_question_rejected`, `milestone_celebrated`.

---

## 19. TESTLAR

**Ishga tushirish:** `cd backend-django && python manage.py test`

### 19.1 `apps/gamerooms/tests.py` (620 qator) — eng to'liq to'plam

| Test klassi | Nimani tekshiradi |
|---|---|
| `RoomLifecycleTest` | Xona yaratish, join→start, ishtirokchisiz start (xato), finish, aktiv savolni yopish, parol, admin bo'lmagan start (xato), ikki marta finish (idempotent) |
| `QuestionPushTest` | Savol push → active, oldingisi yopilmasdan ikkinchisini push (xato), close→push, noto'g'ri vaqt/ball/tur |
| `SubmitAnswerTest` | Ishtirokchi javobi, begona (xato), yopiq savol (xato), bo'sh javob (xato), **deadline majburlash** |
| `UpsertSubmissionTest` | Deadline'gacha tahrirlash, **tahrir baholashni bekor qiladi** |
| `AutoGradeTest` | Aniq moslik, noto'g'ri, `correct_answer` yo'q (xato), **idempotentlik**, ball qo'shilishi |
| `ManualGradeTest` | Qo'lda to'g'ri/noto'g'ri, **override ball farqi**, admin bo'lmagan (xato) |
| `ScoringTest` | Ko'p savolli ball, `point_value` hisobga olinishi |
| `LeakPreventionTest` | Ochiq savolda `correctAnswer` yashirin, yopilgach ko'rinadi, admin ko'rinishi, **boshqalarning javoblari yashirin** |
| `StatsAndLeaderboardTest` | Reyting tartibi, statistika foizlari |

### 19.2 `apps/zakovat_table/tests.py` (248 qator)

| Test klassi | Nimani tekshiradi |
|---|---|
| `TeamFormationTest` | Birinchi qo'shilgan kapitan, 6 kishida to'xtash, muxlis ta'sir qilmasligi |
| `ConfirmTeamTest` | Admin talabi, to'liq jamoa talabi, tasdiqlash |
| `QuestionUploadTest` | Aynan 12 ta talabi, qayta yuklash rad etilishi, 12 tasiz start (xato) |
| `GameRoundTest` | **Spin sektorni takrorlamaydi**, muhokama deadline majburlanadi, faqat kapitan javob beradi va javob o'yinchilardan yashirin, admin verify ball va 6-da g'olib |
| `SpectatorReadOnlyStateTest` | Admin maydonlari `bot` auth'da ko'rinadi, **`tma` auth'da yashirin** (admin bo'lsa ham) |

### 19.3 `apps/users/tests.py` (111 qator)

| Test | Nimani tekshiradi |
|---|---|
| `test_100th_user_triggers_milestone` | 100-chi foydalanuvchi → adminlarga xabar |
| `test_101st_user_does_not_retrigger` | Takror yuborilmaydi |
| `test_returning_user_does_not_trigger` | Qaytgan foydalanuvchi trigger qilmaydi |
| `test_200th_user_triggers_next_milestone` | Keyingi chegara ishlaydi |
| `test_telegram_failure_does_not_break_login` | **Telegram xatosi login'ni buzmaydi** |

### 19.4 Test qamrovi bo'yicha bo'shliqlar

Testlar **yo'q**: `answers` (scoring, ticket, gemini), `battles` (engine), `svoyak`, `daily`, `teams`, `premium`, `channels`, `admin_api`, `ustoz_ai`, `author_questions`, frontend, bot.

**Tavsiya (prioritet tartibida):**
1. `apps/answers/scoring.py` — sof funksiya, test yozish oson, biznes uchun kritik
2. `apps/answers/tickets.py` — imzo/replay
3. `apps/battles/service.py` — atomik gate'lar
4. `apps/premium/limits.py` — limit hisoblagichi
5. `apps/svoyak/repositories.py` — BUZZ race

---

## 20. MA'LUM KAMCHILIKLAR VA TEXNIK QARZ

### 20.1 Hujjat ↔ kod nomuvofiqliklari

| № | Muammo | Fayl | Ta'siri |
|---|---|---|---|
| 1 | `README.md` `@twa-dev/sdk` ishlatiladi deydi, lekin paket o'rnatilmagan | `README.md` vs `frontend/package.json` | Chalkashlik |
| 2 | `DEPLOY.md` da **Supabase** haqida ko'p ma'lumot bor, lekin loyihada Supabase **umuman ishlatilmaydi** (Django ORM) | `DEPLOY.md`, `.env.example` | Yangi dasturchini adashtiradi |
| 3 | `DEPLOY.md` da `git clone` boshqa repozitoriyani ko'rsatadi (`Sunnatullo-Dev/ProSkill-Zakovot-bot`) | `DEPLOY.md:2-qadam` | Noto'g'ri repo klon qilinishi |
| 4 | `README.md` "Ball tizimi" bo'limida bet (garov) tizimi tilga olinmagan | `README.md` | To'liqsiz |
| 5 | `.env.example` da `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` qolgan | `backend-django/.env.example` | Keraksiz sirlar so'raladi |
| 6 | `.env.example` da `GEMINI_MODEL=gemini-2.0-flash`, kodda default `gemini-2.5-flash` | `.env.example` vs `settings.py` | Kichik |

### 20.2 Kod ichidagi nomuvofiqliklar

| № | Muammo | Joy | Ta'siri |
|---|---|---|---|
| 7 | 🐞 Bellashuv xabari **"10 ta savol, har biri 15 soniya"** deydi, aslida `ROUND_TIME_LIMIT_SECONDS = 60` | `battles/service.py:_notify_battle_started` | Foydalanuvchi adashadi |
| 8 | 🐞 `submit_answer` izohida "standart 15s" yozilgan, kodda fallback **90** | `answers/views.py` | Hujjat noto'g'ri |
| 9 | 🐞 `AppSettings.get()` keshdan **dict** qaytsa, baribir DB'dan `get_or_create` qiladi — kesh foyda bermaydi | `core/models.py` | Ortiqcha DB so'rov |
| 10 | 🐞 Vite dev proxy default target `http://localhost:8000`, `run-django.js` esa **3000** portda ishga tushiradi | `vite.config.ts` vs `scripts/run-django.js` | Dev'da proxy ishlamaydi |
| 11 | `.kiro/hooks/auto-commit-push.kiro.hook` ichida **Windows absolyut yo'li** qolgan (`C:\Users\Ucer\...`) | `.kiro/hooks/` | Boshqa mashinada ishlamaydi |
| 12 | `apps/author_questions/urls.py` da `public_urlpatterns`/`admin_urlpatterns` e'lon qilingan, lekin `urls_public.py` va `admin_api/urls.py` alohida ishlatiladi | `author_questions/` | O'lik kod |
| 13 | `ustoz_ai/urls.py` ichidagi `admin_urlpatterns` ishlatilmaydi — `admin_urls.py` ishlatiladi | `ustoz_ai/` | O'lik kod |

### 20.3 Arxitektura/ishlash bo'yicha xavflar

| № | Xavf | Tavsif | Tavsiya |
|---|---|---|---|
| 14 | **⚠️ Ticket replay (ko'p worker)** | `DatabaseCache` + SQLite'da `cache.add` **to'liq atomik emas**. 2 gunicorn worker bir vaqtda bir `jti` ni consume qilishi mumkin | **`REDIS_URL` ni sozlash** (startup'da warning bor) |
| 15 | **Real-time yo'q** | Barcha "real-time" rejimlar **polling** orqali (Svoyak 500 ms, Battle 2 s). WebSocket yo'q | Foydalanuvchi soni oshsa — Django Channels / SSE |
| 16 | **Bot holati xotirada** | Bot restart bo'lsa barcha yarim tugallangan oqimlar yo'qoladi | Redis'da saqlash |
| 17 | **Zakovat Stoli timerlari xotirada** | `discussionTimers` Map — bot restart'da muhokama timeri yo'qoladi | Deadline DB'da bor, bot startup'da tiklash mumkin |
| 18 | **`AdminPanel.tsx` 5226 qator** | Bitta faylda 11 ta bo'lim + o'nlab sub-komponentlar | Bo'limlarni alohida fayllarga ajratish |
| 19 | **`gamerooms/repositories.py` 1709 qator** | Bitta faylda xona, savol, javob, baholash, eksport, media | Modullarga bo'lish |
| 20 | **Gemini xarajati nazoratsiz** | Erkin matnli har javob → API chaqiruv. Kunlik limit/budjet monitoringi yo'q | Kunlik chaqiruv hisoblagichi qo'shish |
| 21 | **Test qamrovi past** | Faqat 3 ta app'da test bor | 19.4-bo'limdagi prioritetlar |
| 22 | **Xato monitoringi yo'q** | Faqat stdout log. Sentry yo'q | Sentry qo'shish |
| 23 | **CI/CD yo'q** | `.github/workflows/` mavjud emas | Test + lint pipeline |
| 24 | **DB backup avtomatlashtirilmagan** | Render Postgres o'zi backup qiladi, lekin manual snapshot siyosati yo'q | Kunlik snapshot |
| 25 | **`seed.sql` / `seed_extra.sql`** | Django migratsiyalaridan tashqarida turgan SQL fayllar | Management command'ga ko'chirish |
| 26 | **`users` eksporti 10 000 bilan cheklangan** | Undan ortiq bo'lsa `truncated: true` | Streaming CSV |
| 27 | **Svoyak `_maybe_finish` faqat snapshot bo'lsa ishlaydi** | Auto rejimda snapshot yo'q — tugatish `_advance_auto_question` da | Yagona mantiq |

### 20.4 Tozalash tavsiyalari (kod sifatini oshirish)

1. `DEPLOY.md` dan Supabase bo'limlarini olib tashlash, `git clone` URL'ini to'g'rilash
2. `.env.example` dan `SUPABASE_*` ni olib tashlash
3. Bellashuv xabaridagi "15 soniya" → "60 soniya"
4. `answers/views.py` izohini `90` ga to'g'rilash
5. `AppSettings.get()` kesh mantig'ini soddalashtirish
6. Vite proxy default portini `3000` ga o'zgartirish
7. `.kiro/hooks/` ni o'chirish yoki nisbiy yo'lga o'tkazish
8. O'lik `urlpatterns` e'lonlarini o'chirish (`author_questions`, `ustoz_ai`)
9. `AdminPanel.tsx` ni bo'limlar bo'yicha ajratish
10. `README.md` ni haqiqiy stek bilan yangilash

---

## 21. TERMINLAR LUG'ATI

| Termin | Ma'nosi |
|---|---|
| **initData** | Telegram WebApp yuboradigan imzolangan foydalanuvchi ma'lumoti (query-string) |
| **Mini App** | Telegram ichida ochiladigan veb-ilova (WebView) |
| **Bilet (ticket)** | Bir martalik HMAC-imzolangan token — bitta savolga bitta javob berish huquqi |
| **`jti`** | JWT ID uslubidagi noyob identifikator — biletni "ishlatilgan" deb belgilash uchun |
| **BUZZ** | Svoyakda "javob berishga birinchi bo'lib qo'l ko'tarish" tugmasi |
| **Snapshot** | Svoyak xonasi yaratilganda doskaga tanlangan savollarning qat'iy nusxasi |
| **Pick** | Svoyakda kategoriya × ball tanlash huquqi (`can_pick`) |
| **Koordinator** | Svoyakda savol o'quvchi rol — ball olmaydi, BUZZ bosolmaydi |
| **Host** | Svoyak xonasini yaratgan foydalanuvchi |
| **Xona admini** | O'yin xonasini yaratgan yoki `extra_admin_ids` ga qo'shilgan admin |
| **Super-admin** | `ADMIN_TELEGRAM_IDS` env ro'yxatidagi admin |
| **Bot-admin** | `bot_admins` DB jadvaliga qo'shilgan admin |
| **Kapitan** | Zakovat Stolida `seat=1` o'yinchi — yakuniy javobni beradi |
| **Muxlis (spectator)** | Zakovat Stolini kuzatuvchi, o'yinga ta'sir qilmaydi |
| **Sektor** | Zakovat Stolida "ot" tushadigan 1–12 raqamli savol o'rni |
| **Streak** | Ketma-ket to'g'ri javoblar (yakka o'yin) yoki ketma-ket kunlar (kunlik topshiriq) |
| **Bet (garov)** | Ballni tikib javob berish (5/10/20/50) |
| **Atomik gate** | Faqat bitta chaqiruv o'tishi mumkin bo'lgan shartli `UPDATE` |
| **Fail-open** | Xato bo'lsa **ruxsat beriladi** (premium limitlari) |
| **Fail-closed** | Xato bo'lsa **rad etiladi** (kanal obunasi, dev bypasslar) |
| **Idempotent** | Takror chaqirilganda natija o'zgarmaydi |
| **Upsert** | Mavjud bo'lsa yangilash, bo'lmasa yaratish |
| **Leak prevention** | Javob/ma'lumotning noo'rin oshkor bo'lishining oldini olish |
| **Deep link** | `t.me/<bot>?startapp=<param>` yoki `/start <param>` havolasi |
| **Polling** | Holatni belgilangan interval bilan qayta so'rash |
| **speed_score_ms** | O'yin xonasida tenglikni buzuvchi ko'rsatkich — javob tezliklari yig'indisi |
| **Milestone** | Har 100-chi yangi foydalanuvchi chegarasi (adminlarga tabrik) |
| **SPA fallback** | API bo'lmagan barcha yo'llarni `index.html` ga yo'naltirish |

---

## ILOVA A — TEZKOR MA'LUMOTNOMA (RAQAMLAR)

| Parametr | Qiymat |
|---|---|
| Raund savollari soni | 10 (1–20) |
| Yakka o'yin savol vaqti | 90 s (yoki savol darajasida 5–120) + 10 s grace |
| Tez javob chegarasi | 4 000 ms → 2 ball |
| Streak bonusi chegarasi | 3 → +1 ball |
| Max ball / javob (server cap) | 3 |
| Kunlik topshiriq savollari | 5 |
| Kunlik streak bonuslari | 3→3 · 7→7 · 14→14 · 30→20 |
| Jamoa max a'zo | 6 |
| Jamoa kodi | 6 belgi (A–Z, 0–9) |
| Chat xabari | ≤ 500 belgi, oxirgi 50 ta |
| Bellashuv raundlari | 10 × 60 s (+2 s grace) |
| Bellashuv g'olib bonusi | +5 ball / a'zo |
| Svoyak kodi | 6 belgi (I/O/0/1 siz) |
| Svoyak ball qiymatlari | 10 / 20 / 30 / 40 / 50 |
| Svoyak auto — o'qish fazasi | 10 000 ms |
| Svoyak auto — javob fazasi | 70 s (default) yoki 5–120 |
| Svoyak auto — savollar soni | 3–8 (yakka) / 7–12 (jamoa) |
| O'yin xonasi kodi | 6 belgi |
| O'yin xonasi vaqt variantlari | 30 / 60 / 90 / 120 / 180 s |
| O'yin xonasi ball variantlari | 1 / 2 / 3 |
| O'yin xonasi grace | 2 000 ms |
| Zakovat Stoli — jamoa | 6 o'yinchi |
| Zakovat Stoli — savollar | 12 (sektor 1–12) |
| Zakovat Stoli — muhokama | 60 s |
| Zakovat Stoli — g'alaba | 6 ball |
| Premium standart limitlar | round 5 · daily 5 · battle 3 · gameroom 5 |
| initData amal qilish muddati | 7 kun |
| Bilet consume TTL | 180 s |
| Kesh TTL (AppSettings / Premium) | 60 s |
| Premium limit hisoblagichi TTL | 26 soat |
| Bot holati TTL | 2 soat |
| Bot kanallar keshi | 5 daqiqa |
| Broadcast tempi | 25 xabar / 1100 ms |
| Gemini timeout | 15 s (+2 s) |
| Gemini javob uzunligi chegarasi | 300 belgi |
| TTS matn chegarasi | 600 belgi |
| Bulk savol import | ≤ 500 |
| Users eksport | ≤ 10 000 |
| Admin brute-force | 5 urinish → 15 daqiqa |
| Splash minimal vaqti | 1 500 ms |
| Gunicorn worker | 2 |
| Vaqt mintaqasi | Asia/Tashkent |

---

## ILOVA B — MUHIM FAYLLAR XARITASI

| Nimani o'zgartirmoqchisiz | Qaysi faylga qarang |
|---|---|
| Sozlamalar, env, CORS, cache, admin URL | `backend-django/zakovat/settings.py` |
| URL marshrutlash, SPA fallback | `backend-django/zakovat/urls.py` |
| Auth mantiqi (initData HMAC) | `backend-django/apps/core/telegram_auth.py` |
| Auth middleware, admin himoyasi | `backend-django/apps/core/middleware.py` |
| Auth dekoratorlari | `backend-django/apps/core/decorators.py` |
| Global sozlamalar modeli | `backend-django/apps/core/models.py` |
| **Ball hisoblash qoidalari** | `backend-django/apps/answers/scoring.py` |
| **Bilet (anti-replay)** | `backend-django/apps/answers/tickets.py` |
| **AI baholash + prompt** | `backend-django/apps/answers/gemini.py` |
| A/B/C/D baholash | `backend-django/apps/answers/grading.py` |
| Javob endpointi (bet, vaqt, ball) | `backend-django/apps/answers/views.py` |
| **Bellashuv dvigateli** | `backend-django/apps/battles/service.py` |
| **Svoyak o'yin mantig'i** | `backend-django/apps/svoyak/repositories.py` |
| **O'yin xonasi mantig'i** | `backend-django/apps/gamerooms/repositories.py` |
| **Zakovat Stoli mantig'i** | `backend-django/apps/zakovat_table/repositories.py` |
| Premium limitlari | `backend-django/apps/premium/limits.py` |
| Kanal obunasi tekshiruvi | `backend-django/apps/channels/repositories.py` |
| Yutuqlar (server) | `backend-django/apps/users/achievements.py` |
| Ball amallari (atomik) | `backend-django/apps/users/repositories.py` |
| **Frontend asosiy oqim** | `frontend/src/App.tsx` |
| **Barcha API chaqiruvlari** | `frontend/src/api/client.ts` |
| Telegram SDK integratsiyasi | `frontend/src/hooks/useTelegram.ts` |
| Tarjimalar | `frontend/src/i18n/strings.ts` |
| Admin paneli | `frontend/src/components/AdminPanel.tsx` |
| Yutuqlar (frontend) | `frontend/src/utils/achievements.ts` |
| Fayldan savol import | `frontend/src/utils/questionFileParser.ts` |
| **Bot asosiy** | `bot/src/bot.ts` |
| Bot — o'yin xonasi | `bot/src/gameroom.ts` |
| Bot — Zakovat Stoli | `bot/src/zakovatTable.ts` |
| Deploy build | `backend-django/build.sh`, `backend-django/Procfile` |

---

> **Hujjat oxiri.**
> Kodda o'zgarish qilinganda ushbu TZ ham yangilanishi kerak — ayniqsa 8-bo'lim (o'yin qoidalari), 9-bo'lim (ball), 11-bo'lim (API) va ILOVA A (raqamlar).



