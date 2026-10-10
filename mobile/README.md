# Zakovat — Mobil ilova (Flutter)

Android va iOS uchun mustaqil mobil ilova. Telegram Mini App'ga bog'liq emas —
foydalanuvchi telefon raqami va parol bilan kiradi.

> **Holat: Bosqich 1A tugadi.** Skelet + `core/` qatlam + `auth` feature
> to'liq ishlaydi. O'yin rejimlari keyingi bosqichlarda qo'shiladi.

---

## Tez boshlash

```bash
# 1. Paketlar
flutter pub get

# 2. Kod generatsiyasi (Freezed / JSON / Retrofit)
dart run build_runner build

# 3. Ishga tushirish
#    Android emulyator uchun 10.0.2.2 = host mashinaning localhost'i
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000

#    iOS simulyator
flutter run --dart-define=API_BASE_URL=http://localhost:3000

#    Haqiqiy qurilma (kompyuter IP'si)
flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000
```

Backend alohida ishga tushirilishi kerak:

```bash
cd ../backend-django
.venv/bin/python manage.py runserver 3000
```

---

## Build

```bash
# Android (release)
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://zakovat-backend-euc8.onrender.com \
  --dart-define=FLAVOR=prod \
  --dart-define=BOT_USERNAME=zakovot_robot

# iOS (release)
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://zakovat-backend-euc8.onrender.com \
  --dart-define=FLAVOR=prod
```

**⚠️ `API_BASE_URL` ni berishni unutmang** — default `http://10.0.2.2:3000`
(faqat emulyator uchun) va release build'da bu ishlamaydi.

---

## Arxitektura

Feature-first + Clean Architecture:

```
lib/
├── main.dart               # kirish nuqtasi, xato zonasi, DI init
├── app/app.dart            # MaterialApp.router, mavzu, lokalizatsiya
├── core/
│   ├── config/             # AppConfig (--dart-define)
│   ├── di/                 # get_it ro'yxatga olish
│   ├── error/              # Failure (domain) + Exception (data)
│   ├── network/            # Dio, ApiPaths, interceptorlar
│   ├── router/             # GoRouter + redirect qoidalari
│   ├── security/           # ScreenGuard (skrinshot bloklash)
│   ├── storage/            # TokenStore (secure), PrefsStore
│   ├── theme/              # Material 3 + Cupertino gibrid
│   ├── time/               # ServerClock (anti-cheat taymer)
│   └── usecase/            # UseCase bazasi
├── features/<feature>/
│   ├── data/               # models (Freezed) · datasources (Retrofit) · repos impl
│   ├── domain/             # entities · repositories (abstract) · usecases
│   └── presentation/       # bloc/cubit · pages · widgets
└── shared/                 # widgets · utils · extensions
```

### Qatlam qoidalari

| Qatlam | Nimani biladi | Nimani BILMAYDI |
|---|---|---|
| `presentation` | `domain` | Dio, JSON, backend formati |
| `domain` | hech nima (sof Dart) | Flutter, Dio, Freezed |
| `data` | `domain` | UI, BLoC |

`domain` qatlamida `Failure`, `data` qatlamida `Exception` ishlatiladi.
Repository ularni bir-biriga o'giradi — shuning uchun UI hech qachon
`try/catch (DioException)` yozmaydi.

---

## Muhim texnik yechimlar

### 1. Token yangilash — single-flight

`core/network/interceptors/auth_interceptor.dart`

Bosh ekranda 5-6 so'rov bir vaqtda ketadi. Access token eskirgan bo'lsa,
sodda yechimda ularning hammasi `/token/refresh` ga uradi. Backend refresh'ni
**rotatsiya** qiladi (eski token darhol bekor bo'ladi) — natijada birinchisi
o'tadi, qolganlari 401 oladi va foydalanuvchi chiqib ketadi.

Yechim: bir vaqtda faqat bitta refresh (`_inFlightRefresh` `Future` qulfi),
qolganlari o'shani kutadi. Refresh uchun **alohida, interceptorsiz Dio** —
aks holda cheksiz rekursiya.

### 2. Server soati — anti-cheat

`core/time/server_clock.dart`

Qurilma vaqtiga ishonilmaydi (foydalanuvchi uni o'zgartira oladi).
`/api/time` dan server vaqti olinadi, RTT/2 kompensatsiya qilinadi va
**monotonik** `Stopwatch` bilan hisoblanadi (`DateTime.now()` sakraydi,
`Stopwatch` sakramaydi).

Backend baribir o'z tekshiruvini qiladi (bilet `issued_at_ms`, savol
`deadline`) — bu faqat UI aniqligi uchun.

### 3. Skrinshot bloklash

`core/security/screen_guard.dart`

* **Android** — `FLAG_SECURE`, to'liq ishlaydi
* **iOS** — Apple ekvivalent bermaydi; skrinshotni **to'liq to'sib bo'lmaydi**,
  faqat aniqlash va ekran yozuvida yashirish mumkin. Bu platforma cheklovi.

Faqat savol ekranlarida yoqiladi (`ScreenGuardMixin`), aks holda foydalanuvchi
natijasini ulasha olmaydi.

### 4. Navigatsiya — bitta manba

`core/router/app_router.dart`

Yo'naltirish mantig'i faqat `redirect` funksiyasida. Ekranlar o'zini
`context.go()` bilan surib yubormaydi — aks holda splash ham, router ham
navigatsiya qilib "ekran miltillashi" paydo bo'ladi.

`AuthBloc` — sessiyaning yagona manbai, router uni `refreshListenable`
orqali kuzatadi.

---

## Test

```bash
flutter test
flutter analyze
```

| Fayl | Nimani tekshiradi |
|---|---|
| `test/validators_test.dart` | Telefon normalizatsiyasi va parol siyosati **backend bilan bir xilligi** |
| `test/auth_bloc_test.dart` | Sessiya holatlari: tiklash, 401, tarmoq xatosi, login, logout |

**Muhim:** `shared/utils/validators.dart` va backenddagi
`apps/auth_api/credentials.py` qoidalari **bir xil bo'lishi shart**.
Ular ajralib ketsa foydalanuvchi tushunarsiz server xatolarini ko'radi.

---

## Backend bog'liqligi

Bu ilova backenddagi **yangi JWT auth qatlamiga** tayanadi:

| Endpoint | Vazifasi |
|---|---|
| `POST /api/auth/register` | Telefon + parol bilan ro'yxatdan o'tish |
| `POST /api/auth/login/password` | Kirish |
| `POST /api/auth/token/refresh` | Token yangilash (rotatsiya bilan) |
| `POST /api/auth/logout` | Refresh tokenni bekor qilish |
| `POST /api/auth/logout/all` | Barcha qurilmalardan chiqish |
| `GET /api/auth/me` | Profil |
| `PATCH /api/auth/password` | Parolni o'zgartirish |
| `POST /api/auth/link-telegram` | Telegram akkauntini bog'lash |
| `GET /api/time` | Server vaqti (taymer sinxronizatsiyasi) |

Mavjud o'yin endpointlari (`/api/questions/round`, `/api/answer`, ...)
**o'zgarmagan** — ular `Authorization: Bearer <jwt>` bilan ham ishlaydi,
chunki middleware JWT'dan `telegram_id` ni oladi.

---

## Keyingi bosqichlar

| Bosqich | Mazmuni |
|---|---|
| **1B** | Yakka o'yin (quiz) · Kunlik topshiriq · Reyting · Profil |
| **2** | Jamoa · Bellashuv (real-time polling) |
| **3** | Svoyak (klassik + auto) |
| **4** | Online O'yin Xonasi |
| **5** | Premium · Ustoz AI · Muallif savollari |
