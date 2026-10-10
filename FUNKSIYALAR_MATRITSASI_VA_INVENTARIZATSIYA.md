# ZAKOVAT APP — TO'LIQ FUNKSIYALAR INVENTARIZATSIYASI VA PARITET MATRITSASI

Ushbu hujjat Telegram Bot, Telegram Mini App (TMA), Django Backend va Flutter Mobil ilovasi o'rtasidagi funksiyalar paritetini to'liq tahlil qiladi va har bir modulning holatini ko'rsatadi.

---

## 1. FUNKSIYALARNING TO'LIQ INVENTARIZATSIYASI

### A. Foydalanuvchi & Autentifikatsiya
1. **Telefon + Parol orqali kirish:** Backend JWT (`/api/auth/login/password`). Flutterda mavjud.
2. **Ro'yxatdan o'tish:** Telefon, ism, parol. Backend (`/api/auth/register`). Flutterda mavjud.
3. **Telegram initData kirish:** Telegram TMA uchun (`/api/auth/`). Flutter uchun esa hisobni bog'lash (`/api/auth/link-telegram`).
4. **Sessiya va JWT token yangilash:** `/api/auth/token/refresh`. TokenStore + Dio Interceptor orqali ishlaydi.
5. **Parolni o'zgartirish:** `/api/auth/password`. Flutterda placeholder edi -> to'liq implementatsiya qilinadi.
6. **Profil ko'rish va yangilash:** Ball, streak, yutuqlar, o'yin statistikasi (`/api/users/profile`, `/api/users/stats`).
7. **Referal tizimi:** Havola generatsiya qilish va taklif qilingan do'stlar uchun bonus ballar.
8. **Majburiy kanallar (OP):** `/api/channels/` va `/api/channels/check`.

### B. O'yin Rejimlari
1. **Yakka o'yin (Quiz):** Qiyinlik darajasi bo'yicha savollar, taymer, ballar.
2. **Kunlik topshiriq (Daily Challenge):** Har kuni 5 ta savol, streak va maxsus bonuslar (`/api/daily/`).
3. **1v1 Bellashuv (Battle):** Do'stni yoki tasodifiy o'yinchini jangga chorlash, 10 raund x 60s, kapitan javobi (`/api/battles/`).
4. **Svoyak (Jeopardy formati):** 
   - Kategoriyalar va 10–50 ballik doska.
   - Xona yaratish / kod bilan qo'shilish (`/api/svoyak/rooms`).
   - "BUZZ" (tugmani birinchi bosish) mexanikasi.
   - Avtomatik o'yin rejimi (Auto-play).
5. **Online O'yin Xonasi (GameRoom):** 
   - Admin savol push qiladi, ishtirokchilar kod bilan qo'shiladi.
   - Real-vaqt javob berish, reyting yangilanishi (`/api/gamerooms/`).
6. **Zakovat Stoli (Jonli stol formati):**
   - 6 o'yinchi, 12 sektor, kapitan boshqaruvi, qo'shimcha daqiqa olish, ovozli muhokama (`/api/zakovat-table/`).

### C. Jamoaviy Tizim (Team)
1. **Jamoa yaratish / qo'shilish:** Kod orqali a'zo bo'lish (`/api/teams/`).
2. **Jamoa a'zolari ro'yxati va boshqaruv:** Sardor almashtirish, jamoa nomini o'zgartirish, chiqish.
3. **Jamoa chati:** Jamoa ichida real-vaqt xabarlar almashish (`/api/teams/my/chat`).
4. **Jamoalar reytingi:** Jamoaviy ballar va rekordlar.

### D. Reyting va Statistika
1. **Global reyting (Leaderboard):** Kunlik, oylik va umumiy peshqadamlar jadvali (`/api/users/leaderboard`).
2. **O'yin tarixi (Game History):** Foydalanuvchining o'tgan o'yinlari, to'plagan ballari va natijalari (`/api/users/history`).
3. **Yutuqlar (Achievements):** 5 ta asosiy yutuq nishonlari va ochilish shartlari (`/api/users/achievements`).

### E. Premium va To'lovlar
1. **Premium tariflari va imtiyozlari:** `/api/premium/info`.
2. **Chek yuklash / so'rov yuborish:** `/api/premium/request`.
3. **Xarid tarixi:** `/api/premium/history`.

### F. Administrator Imkoniyatlari (Admin Panel)
1. **Dashboard va umumiy statistika:** `/api/admin/stats`.
2. **Savollar bazasi (CRUD):** Savol qo'shish, ko'rish, tahrirlash, o'chirish (`/api/admin/questions`).
3. **Kategoriyalar boshqaruvi:** `/api/admin/categories`.
4. **Foydalanuvchilar boshqaruvi:** Qidirish, ko'rish, xabar yuborish, premium berish (`/api/admin/users`).
5. **Majburiy kanallar boshqaruvi:** Yangi kanal qo'shish va o'chirish (`/api/admin/channels`).
6. **Premium so'rovlarini tasdiqlash/rad etish:** `/api/admin/premium/requests`.
7. **Muallif savollarini ko'rib chiqish:** `/api/admin/author-questions`.

---

## 2. FUNKSIYALARNING PARITET MATRITSASI

| Funksiya / Modul | Telegram Bot | Telegram Mini App | Backend API | Flutter Mobile | Holat va Harakatlar |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Auth: Telefon + Parol** | ❌ (TG ID) | ❌ (initData) | ✅ Mavjud | ✅ Mavjud | To'liq ishlamoqda (moslashuvchan login) |
| **Auth: Token Refresh & Sessiya**| ❌ | ❌ | ✅ Mavjud | ✅ Mavjud | To'liq ishlamoqda (TokenStore + SharedPreferences) |
| **Parolni o'zgartirish** | ❌ | ❌ | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`ChangePasswordPage`) |
| **Yakka o'yin (Quiz)** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq ishlamoqda (Ticket anti-cheat bilan) |
| **Kunlik topshiriq (Daily)** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq ishlamoqda (Streak bonusi bilan) |
| **Global Reyting** | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq ishlamoqda |
| **Profil va Statistika** | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq ishlamoqda |
| **O'yin tarixi (History)** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`GameHistoryPage`) |
| **Yutuqlar (Achievements)** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`AchievementsPage`) |
| **1v1 Bellashuv (Battle)** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`BattlePage`) |
| **Svoyak doskasi & Lobbi** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`SvoyakLobbyPage`, `SvoyakBoardPage`) |
| **Online O'yin Xonasi (GameRoom)**| ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`GameRoomJoinPage`, `GameRoomPlayPage`) |
| **Zakovat Stoli (Jonli stol)** | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`ZakovatTableJoinPage`, `ZakovatTableRoomPage`) |
| **Jamoa va Jamoa chati (Team)** | ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`TeamScreen`) |
| **Premium xarid va chek yuklash**| ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`PremiumPage`, `PremiumCheckoutPage`, `PremiumHistoryPage`) |
| **Admin Panel (Boshqaruv)** | ✅ (Komandalar)| ✅ (AdminPanel)| ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`AdminPanelPage`) |
| **Majburiy kanallar tekshiruvi** | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (Admin va API orqali) |
| **Sozlamalar (Til, tovush, haptic)**| ❌ | ✅ Mavjud | ✅ Mavjud | ✅ Mavjud | To'liq amalga oshirildi (`SettingsPage`) |

