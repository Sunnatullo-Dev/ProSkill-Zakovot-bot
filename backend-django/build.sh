#!/usr/bin/env bash
# Render build script — backend Python paketlari + frontend vite build.
#
# Render Dashboard'da Build Command sifatida o'rnatiladi:
#   bash backend-django/build.sh
#
# Bu skript:
#   1. Backend Python paketlarini o'rnatadi
#   2. Frontend Node paketlarini o'rnatadi (Node 18+ Render image'ida bor)
#   3. Frontend'ni production VITE_API_URL bilan build qiladi → frontend/dist/
#   4. Django collectstatic — WhiteNoise frontend/dist/'dan SPA xizmat qiladi
set -euo pipefail

echo "[build] === Backend Python paketlari ==="
cd "$(dirname "$0")"  # backend-django/
pip install -r requirements.txt

echo "[build] === Frontend Vite build ==="
cd ../frontend
npm ci --no-audit --no-fund
# Cache'ni tozalaymiz — eski build artefaktlar yangi bundlega aralashmasin
rm -rf dist
# VITE_API_URL Render Dashboard'dagi env'dan keladi.
npm run build

echo "[build] === Django collectstatic ==="
cd ../backend-django
python manage.py collectstatic --noinput

echo "[build] === Django cache table (DatabaseCache uchun) ==="
# DatabaseCache backend uchun jadval kerak — bir marta yaratilsa keyingi
# runlarda ham xavfsiz (idempotent). Redis ishlatilayotgan bo'lsa bu buyruq
# ham xavfsiz — faqat jadval mavjud emasligini tekshiradi.
python manage.py createcachetable

echo "[build] === Tugadi ==="
