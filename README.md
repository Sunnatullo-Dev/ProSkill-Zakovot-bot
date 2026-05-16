# Zakovat

Zakovat - Telegram Mini App uchun bilim tekshirish MVP o'yini.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, `@twa-dev/sdk`
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL via Supabase
- AI: Google Gemini API

## Ishga tushirish

1. `npm install`
2. `frontend/.env` ichidagi `VITE_BOT_USERNAME` qiymatini bot username bilan almashtiring.
3. `backend/.env` ichidagi Supabase, Telegram va Gemini secretlarini haqiqiy qiymatlar bilan almashtiring.
4. Supabase SQL editor ichida quyidagi schema'ni bajaring.
5. `npm run dev`

## Environment

`backend/.env`

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
ADMIN_TELEGRAM_IDS=123456789,987654321
```

`ADMIN_TELEGRAM_IDS` - vergul bilan ajratilgan admin Telegram ID lari. Shu hisoblar ilovada "Admin" bo'limini ko'radi va yuborilgan savollarni tasdiqlaydi.

`frontend/.env`

```env
VITE_API_URL=http://localhost:3000
VITE_BOT_USERNAME=your_bot_username
```

## Database schema

```sql
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  first_name text,
  last_name text,
  username text,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  correct_answer text not null,
  category text,
  difficulty text,
  created_at timestamptz not null default now()
);

create table question_submissions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  correct_answer text not null,
  category text,
  difficulty text,
  submitted_by bigint not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table game_results (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  correct_count integer not null,
  total_count integer not null,
  round_score integer not null,
  created_at timestamptz not null default now()
);

create index idx_users_telegram_id on users (telegram_id);
create index idx_questions_created_at on questions (created_at);
create index idx_submissions_status on question_submissions (status);
create index idx_game_results_telegram_id on game_results (telegram_id);
```

`question_submissions` - foydalanuvchilar yuborgan savollar. `status` qiymatlari: `pending`, `approved`, `rejected`. Admin tasdiqlaganda savol `questions` jadvaliga ko'chiriladi va muallifga bonus ball qo'shiladi.

`game_results` - har bir tugatilgan raund natijasi (to'g'ri javoblar soni, savollar soni, raund bali). Profil ekranidagi statistika shu jadval asosida hisoblanadi.

## Ball tizimi

Har bir to'g'ri javob uchun ball: `(asosiy + tezlik) × streak`.

- Asosiy ball qiyinlikka qarab: oson 10, o'rta 15, qiyin 20.
- Tezlik bonusi: qancha tez javob berilsa, shuncha ko'p (0..10).
- Streak: 3 va undan ortiq ketma-ket to'g'ri javobda ball ×1.5 ga ko'paytiriladi.

## Fayllar tavsifi

- `package.json` - monorepo workspaces va umumiy scriptlarni boshqaradi.
- `frontend/src/App.tsx` - Telegram login, savol olish, javob yuborish, taymer va ball oqimini birlashtiradi.
- `frontend/src/api/client.ts` - backend API bilan ishlash uchun yagona client.
- `frontend/src/hooks/useTelegram.ts` - Telegram Web App SDK'dan `initData` va user ma'lumotlarini oladi.
- `frontend/src/hooks/useTimer.ts` - 15 soniyalik raund taymerini yuritadi.
- `backend/src/app.ts` - Express app, middleware va routelarni ulaydi.
- `backend/src/services/telegram.service.ts` - Telegram `initData` imzosini tekshiradi.
- `backend/src/services/gemini.service.ts` - Gemini orqali foydalanuvchi javobini baholaydi.
- `backend/src/repositories/user.repository.ts` - `users` jadvali bilan ishlaydi.
- `backend/src/repositories/question.repository.ts` - `questions` jadvali bilan ishlaydi.
