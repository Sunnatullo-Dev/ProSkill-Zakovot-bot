# Zakovat App — Telegram Tizimi To'liq Arxitekturasi va Ishlash Qo'llanmasi (1% - 100%)

Ushbu hujjat **Zakovat App** loyihasining Telegram ekotizimi qanday tuzilganligi, Telegram Bot, Telegram Mini App (TMA), Django Backend va Mobile ilova o'rtasidagi bog'liqliklar hamda barcha mexanizmlarni 0 dan 100% gacha to'liq tushuntirib beradi.

---

## MUNDARIJA
1. [Umumiy Arxitektura va Ekotizim Ko'rinishi](#1-umumiy-arxitektura-va-ekotizim-korinishi)
2. [Telegram Bot Tuzilishi (`bot/`)](#2-telegram-bot-tuzilishi-bot)
   - 2.1. Texnologik stak
   - 2.2. Asosiy bot logikasi (`src/bot.ts`)
   - 2.3. O'yin xonalari tizimi (`src/gameroom.ts`)
   - 2.4. Zakovat stoli va ovozli boshqaruv (`src/zakovatTable.ts`)
   - 2.5. Majburiy kanallar tekshiruvi (OP)
   - 2.6. Deep Linking va Referal tizimi
3. [Backend va Telegram Autentifikatsiyasi (`backend-django/`)](#3-backend-va-telegram-autentifikatsiyasi-backend-django)
   - 3.1. Telegram `initData` kriptografik tekshiruvi
   - 3.2. Telegram foydalanuvchisini ro'yxatga olish
   - 3.3. Sintetik Telegram ID tizimi (Mobile ilova bilan integratsiya)
   - 3.4. Bot va Backend o'rtasidagi aloqa
4. [Telegram Mini App (Frontend — `frontend/`)](#4-telegram-mini-app-frontend)
   - 4.1. TMA SDK va Telegram bilan integratsiya
   - 4.2. UI/UX komponentlar (MainButton, Haptics, Mavzular)
   - 4.3. API bilan muloqot va so'rovlar
5. [O'yin Mexanikalari va Rejimlari](#5-oyin-mexanikalari-va-rejimlari)
   - 5.1. 1v1 Battle rejimi
   - 5.2. Svoyak o'yini
   - 5.3. Kundalik savollar (Daily Quiz) va Streak
   - 5.4. Ustoz AI (Gemini AI orqali savol tekshiruvi)
6. [Xavfsizlik va Anti-Cheat Tizimi](#6-xavfsizlik-va-anti-cheat-tizimi)
7. [0 dan 100% gacha Sozlash va Ishga Tushirish Yo'riqnomasi](#7-0-dan-100-gacha-sozlash-va-ishga-tushirish-yoriqnomasi)

---

## 1. Umumiy Arxitektura va Ekotizim Ko'rinishi

Zakovat platformasi 4 ta asosiy o'zaro bog'liq komponentdan iborat:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TELEGRAM EKOTIZIMI                            │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │   Telegram Bot (grammY)   │      │  Telegram Mini App (React)  │   │
│   │   • Kanal tekshiruvi      │      │  • O'yin interfeysi         │   │
│   │   • Xonalar (GameRooms)   │      │  • Reyting va do'stlar      │   │
│   │   • Ovozli Zakovat stoli  │      │  • Haptic & Native UI       │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │                                   │
                  │ REST API                          │ initData / JWT
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Django REST)                           │
│   • Foydalanuvchilar va sintetik ID-lar                                │
│   • HMAC-SHA256 initData validatsiyasi                                 │
│   • Savollar bazasi va AI (Gemini) tekshiruvi                          │
│   • SQLite / PostgreSQL / Redis kesh                                   │
└─────────────────────────────────▲──────────────────────────────────────┘
                                  │
                                  │ REST API (JWT)
┌─────────────────────────────────┴──────────────────────────────────────┐
│                      MOBILE ILOVA (Flutter)                            │
│   • iOS & Android ilovasi                                              │
│   • Telegram akkauntni telefon raqamga bog'lash imkoniyati             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Telegram Bot Tuzilishi (`bot/`)

### 2.1. Texnologik Stak
- **Freymvork:** [grammY](https://grammy.dev/) (zamonaviy, tezkor TypeScript Telegram bot kutubxonasi).
- **Til:** TypeScript / Node.js (ES Modules).
- **Yordamchi modullar:** `pdf-parse` (savollar bazasini PDF dan import qilish), `dotenv` (sozlamalar).

### 2.2. Asosiy Bot Logikasi (`src/bot.ts`)
Bot foydalanuvchi bilan quyidagi asosiy nuqtalarda ishlaydi:
1. **/start komandasi:** Foydalanuvchini kutib oladi, agar referal havola orqali kirgan bo'lsa, taklif qiluvchiga bonus ball yozadi.
2. **Majburiy obuna (OP):** Foydalanuvchi o'yinni boshlashdan oldin homiy kanallarga a'zo bo'lganligini Telegram API (`getChatMember`) orqali tekshiradi.
3. **Mini App tugmasi:** Inline klaviatura orqali `web_app: { url: MINI_APP_URL }` parametri bilan Mini App'ni to'g'ridan-to'g'ri Telegram ichida ochadi.
4. **Admin paneli:** Adminlar uchun savol qo'shish, xabar tarqatish (broadcast) va statistika ko'rish imkoniyati.

### 2.3. O'yin Xonalari Tizimi (`src/gameroom.ts`)
Foydalanuvchilar bot orqali o'zaro jonli bellashuv xonalarini yaratishi mumkin:
- **Xona yaratish:** Noyob 6 xonali kod yoki havola (`t.me/bot?start=room_ABC123`) yaratiladi.
- **Raundlar ketma-ketligi:** 
  1. Savol e'lon qilinadi;
  2. 60 soniyalik hisoblagich (timer) ishga tushadi;
  3. Foydalanuvchilar javoblarini botga yozishadi;
  4. Raund yakunida to'g'ri javob e'lon qilinib, ochkolar hisoblanadi.

### 2.4. Zakovat Stoli va Ovozli Boshqaruv (`src/zakovatTable.ts`)
Klassik "Zakovat" teledasturi formatidagi maxsus stol rejimi:
- Foydalanuvchilar nafaqat matn, balki **ovozli xabar (voice message)** yuborib javob bera oladilar.
- Ovozli xabarlar matnga o'girilib, to'g'riligi AI yordamida tekshiriladi.
- Stol boshqaruvchisi (kapitan) xohishiga ko'ra raundni boshlash, to'xtatish yoki qo'shimcha vaqt olishi mumkin.

### 2.5. Majburiy Kanallar Tekshiruvi
Kanallar ro'yxati qattiq kodlanmagan — ular **Django Backend**dagi `/api/channels/` endpointidan dinamik olinadi:
```typescript
async function checkUserSubscription(bot: Bot, userId: number): Promise<boolean> {
  const channels = await getRequiredChannels();
  for (const ch of channels) {
    const member = await bot.api.getChatMember(ch.channelId, userId);
    if (['left', 'kicked'].includes(member.status)) {
      return false; // Hali a'zo bo'lmagan
    }
  }
  return true;
}
```

---

## 3. Backend va Telegram Autentifikatsiyasi (`backend-django/`)

### 3.1. Telegram `initData` Kriptografik Tekshiruvi
Telegram Mini App ochilganda, Telegram ilovasi veb-sahifaga maxfiy kalit bilan imzolangan `window.Telegram.WebApp.initData` qatorini uzatadi.

Backend bu ma'lumotni soxtalashtirilmaganligini tekshirish uchun **HMAC-SHA256** algoritmidan foydalanadi (`apps/core/telegram_auth.py`):

1. **Secret Key hosil qilish:**
   $$\text{SecretKey} = \text{HMAC-SHA256}(\text{key}="WebAppData", \text{data}=\text{TELEGRAM\_BOT\_TOKEN})$$
2. **Ma'lumotlar qatorini saralash:**
   Barcha parametrlar (`auth_date`, `query_id`, `user` va h.k.) alifbo tartibida kalit bo'yicha saralanib, `\n` bilan birlashtiriladi.
3. **Hash tekshiruvi:**
   $$\text{CalculatedHash} = \text{HMAC-SHA256}(\text{key}=\text{SecretKey}, \text{data}=\text{DataCheckString})$$
   Agar hisoblangan hash kelgan `hash` bilan mos tushsa — foydalanuvchi haqiqiy va xavfsiz hisoblanadi!

### 3.2. Foydalanuvchini Ro'yxatga Olish
Telegram orqali kirganda qo'shimcha login yoki parol so'ralmaydi:
- Telegramdagi `id`, `first_name`, `last_name`, `username` ma'lumotlari avtomatik Django `User` modeliga saqlanadi.
- Agar foydalanuvchi birinchi marta kirayotgan bo'lsa, unga "first-game" yutug'i va 0 ball bilan yangi profil ochiladi.

### 3.3. Sintetik Telegram ID Tizimi (Mobile bilan bog'liqlik)
Zakovat ilovasida mobile ilova (Flutter) va Telegram foydalanuvchilari bitta bazada ishlaydi:
- Telegram foydalanuvchilarining ID raqami: masalan, `123456789`.
- Mobil ilovadan telefon raqam orqali kirganlar uchun sun'iy ID: `2000000000001+` (Synthetic Telegram ID).
- Agar foydalanuvchi keyinchalik mobil ilovada o'zining Telegramini bog'lasa (`/api/auth/link-telegram`), uning profili birlashtiriladi va barcha ochkolari saqlanib qoladi.

---

## 4. Telegram Mini App (Frontend — `frontend/`)

### 4.1. Telegram SDK Integratsiyasi
React ilovasi ishga tushishi bilan Telegram interfeysiga moslashadi:
```javascript
const tg = window.Telegram?.WebApp;
tg.ready();
tg.expand(); // Ekranni to'liq balandlikda ochish
```

### 4.2. Native UI Imkoniyatlari
- **Haptic Feedback:** Foydalanuvchi to'g'ri javob berganda yumshoq tebranish (`tg.HapticFeedback.notificationOccurred('success')`), xato javobda esa ogohlantiruvchi tebranish beradi.
- **MainButton:** Pastki qismdagi sariq Telegram asosiy tugmasi o'yinni boshlash yoki javobni tasdiqlash uchun ishlatiladi.
- **Theme Params:** Telegramning qorong'i yoki yorug' rejimiga (Dark/Light mode) avtomatik moslashadi.

---

## 5. O'yin Mexanikalari va Rejimlari

1. **1v1 Battle (`apps/battles`):**
   - Ikki o'yinchi onlayn tarzda bir xil savollarga javob beradi.
   - Tezlik va aniqlik hisobga olinadi. Ko'p ball to'plagan g'olib bo'ladi.
2. **Svoyak (`apps/svoyak`):**
   - Mavzular bo'yicha saralangan qiyinlik darajalari (10, 20, 30, 40, 50 ballik savollar).
3. **Kundalik Savollar va Streak (`apps/daily`):**
   - Har kuni foydalanuvchiga bitta maxsus savol beriladi.
   - Ketma-ket har kuni javob berish "Streak" kunlik seriyasini oshiradi.
4. **Ustoz AI (`apps/ustoz_ai`):**
   - Google Gemini API integratsiyasi orqali matnli javoblar semantik tahlil qilinadi.
   - Agar o'yinchi to'liq so'zni yozmasa ham, ma'nosi to'g'ri bo'lsa, AI javobni qabul qilishi mumkin.

---

## 6. Xavfsizlik va Anti-Cheat Tizimi

- **JWT Token Rotatsiyasi:** Har 30 daqiqada yangilanadigan access token va rotatsiyali refresh token.
- **Rate Limiting:** Har bir IP va Telegram ID bo'yicha daqiqasiga ruxsat etilgan so'rovlar chegaralangan (DDoS va brute-force dan himoya).
- **Vaqt sinxronizatsiyasi:** Savol berilgan vaqt va javob qabul qilingan vaqt server tomonda qat'iy nazorat qilinadi (taymerni aldashning iloji yo'q).

---

## 7. 0 dan 100% gacha Sozlash va Ishga Tushirish Yo'riqnomasi

### 1-qadam: BotFather orqali Bot yaratish
1. Telegramda `@BotFather` ga kiring va `/newbot` buyrug'ini bering.
2. Bot nomi va username kiriting (masalan: `ZakovatQuizBot`).
3. Berilgan `TELEGRAM_BOT_TOKEN` ni oling.
4. BotFather'da `/setmenubutton` buyrug'i orqali Mini App URL manzilini sozlang.

### 2-qadam: Backendni Ishga Tushirish
```bash
cd ZakovatApp/backend-django
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:3000
```

### 3-qadam: Telegram Botni Ishga Tushirish
```bash
cd ZakovatApp/bot
npm install
# .env faylida TELEGRAM_BOT_TOKEN va BACKEND_URL=http://localhost:3000 ni ko'rsating
npm start
```

### 4-qadam: Telegram Mini App (Frontend)ni Ishga Tushirish
```bash
cd ZakovatApp/frontend
npm install
npm run dev
```

Ushbu 4 qadam to'liq bajarilganda butun Zakovat ekotizimi to'liq va uzluksiz ishga tushadi!
