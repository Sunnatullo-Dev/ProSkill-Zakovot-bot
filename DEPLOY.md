# Zakovat — Serverga qo'yish ko'rsatmasi

Bu hujjat Telegram WebApp loyihasini productionga chiqarish bo'yicha qadamlarni
ro'yxatga oladi. Backend Django'da, frontend Vite/React, bot grammy.

---

## ⚠️ 0-qadam: Maxfiy kalitlarni ALMASHTIRING

Eski `.env` fayllarda tokenlar va kalitlar bor — agar ular GitHub'ga tushgan
bo'lsa (.gitignore'da bo'lsa ham xato bo'lishi mumkin), ularni HOZIROQ
yangilang:

1. **Telegram bot tokeni** — `@BotFather` da `/revoke` qilib yangi token oling
2. **Supabase service-role kalit** — Supabase Dashboard → Settings → API → Reset
3. **Gemini API kalit** — Google AI Studio → Manage keys → Delete old + create new
4. **Django SECRET_KEY** — `python -c "import secrets; print(secrets.token_urlsafe(64))"`

---

## 1-qadam: Supabase schema migration

SQL Editor'da quyidagi migration'larni ishga tushiring (agar bo'lmagan bo'lsa):

```sql
-- users jadvalida display_name va unlocked_achievements ustunlari kerak
alter table users add column if not exists display_name text;
alter table users add column if not exists unlocked_achievements text[]
  not null default '{}'::text[];

-- battles uchun:
alter table battle_challenges
  add column if not exists current_round_number int not null default 0;
alter table battle_rounds
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;
create unique index if not exists idx_battle_answer_unique
  on battle_answers (round_id, telegram_id);
```

---

## 2-qadam: Backend (Django) deploy

### Variant A — Render / Railway

1. `backend-django/` papkasini root sifatida ko'rsating
2. Build command: `pip install -r requirements.txt`
3. Start command: `Procfile`dan o'qiladi (`gunicorn ...`)
4. Environment variables:

```
DJANGO_SECRET_KEY=<yangi maxfiy kalit, 50+ belgi>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=api.sizning-domen.uz
NODE_ENV=production
FRONTEND_URL=https://sizning-frontend.com
TELEGRAM_BOT_TOKEN=<yangi token>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=<yangi service-role kalit>
GEMINI_API_KEY=<yangi kalit>
GEMINI_MODEL=gemini-2.0-flash
ADMIN_TELEGRAM_IDS=7566796449
MINI_APP_URL=https://sizning-frontend.com
```

`NODE_ENV=production` o'rnatilsa:
- Guest fallback yopiladi (faqat haqiqiy Telegram initData qabul qilinadi)
- CORS faqat `FRONTEND_URL`dan ruxsat etadi
- `DJANGO_SECRET_KEY` va `DJANGO_ALLOWED_HOSTS` majburiy (yo'qolsa server ko'tarilmaydi)

### Variant B — VPS / o'z server

```bash
git clone https://github.com/Sunnatullo-Dev/ProSkill-Zakovot-bot
cd ProSkill-Zakovot-bot/backend-django
python -m venv .venv
source .venv/bin/activate    # yoki Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env ichidagi qiymatlarni to'ldiring
python manage.py collectstatic --noinput
gunicorn zakovat.wsgi:application --bind 0.0.0.0:3000 --workers 2 \
  --access-logfile - --error-logfile - --log-level info
```

Nginx reverse proxy + HTTPS (Let's Encrypt) qo'shing.

---

## 3-qadam: Frontend deploy

### Vercel

1. `frontend/` papkasini root sifatida
2. Build command: `npm run build` (yoki `vite build`)
3. Output directory: `dist`
4. Environment variables:

```
VITE_API_URL=https://api.sizning-domen.uz
```

⚠️ `VITE_API_URL` o'rnatilmasa, frontend `localhost:3000` ga uradi va ishlamaydi.

### Boshqa hosting

```bash
cd frontend
VITE_API_URL=https://api.sizning-domen.uz npm run build
# dist/ papkasini statik fayl serverga ko'taring
```

---

## 4-qadam: Telegram bot deploy

Bot Render / Railway / o'z VPS'da ishlasin:

```
bot/.env:
  TELEGRAM_BOT_TOKEN=<yangi token>
  ADMIN_ID=7566796449
  MINI_APP_URL=https://sizning-frontend.com    # HTTPS shart!
```

```bash
cd bot
npm install
npm start     # tsx src/bot.ts
```

Bot kontainerda ishlasa SIGTERM signalini to'g'ri qabul qiladi (graceful shutdown).

---

## 5-qadam: BotFather sozlamalari

Telegram'da `@BotFather` ga:

```
/setmenubutton
@zakovot_robot
Mini App URL: https://sizning-frontend.com
Button text: Zakovat
```

```
/setdomain
@zakovot_robot
sizning-frontend.com
```

---

## 6-qadam: Tekshirish

Deploy'dan keyin:

1. `https://api.sizning-domen.uz/health` → `{"ok": true}` qaytarishi kerak
2. Telegram'da `/start` → "Zakovat o'yinini ochish" tugmasi paydo bo'ladi
3. Mini App ochilganda kategoriyalar yuklanadi
4. 1 raund o'ynab ko'ring — ball saqlanadi

Server loglarini kuzating:
- Telegram API xatolari (`[bot] Telegram API xatosi ...`)
- Gemini timeout (`Gemini call failed`)
- Supabase ulanish xatosi (`User upsert failed` va h.k.)

---

## Production-da nimalar faol

- ✅ DEBUG=False (server ichki ma'lumotlarni qaytarmaydi)
- ✅ ALLOWED_HOSTS aniq ro'yxat (boshqa domenlardan kelgan so'rovlar rad etiladi)
- ✅ SECRET_KEY tashqi env'dan (default fallback yo'q)
- ✅ Guest fallback yopiq (faqat Telegram initData)
- ✅ CORS qattiq (faqat FRONTEND_URL)
- ✅ Rate limit: /login 20/min, /answer 60/min, /battles/challenge 10/min
- ✅ WhiteNoise static fayllar
- ✅ Logging structured (timestamp + level)
- ✅ Atomik gate'lar bellashuv race condition'larini yopadi
- ✅ Bot graceful shutdown (SIGTERM/SIGINT)
- ✅ Bot MINI_APP_URL HTTPS tekshiruvi

## Production-da nimalar yo'q (kelajakda)

- ⏳ Sentry yoki shunga o'xshash xato monitoring (hozir faqat stdout log)
- ⏳ Redis cache (hozir ratelimit local-memory — bitta worker uchun)
- ⏳ CI/CD pipeline (`.github/workflows/`)
- ⏳ Database backup (Supabase o'zi qiladi, lekin manual snapshot tavsiya)
