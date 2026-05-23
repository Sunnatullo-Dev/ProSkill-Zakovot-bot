"""Savollarni seed.sql + seed_extra.sql fayllaridan bazaga yuklash.

Foydalanish:
    python manage.py seed_questions

Production'da:
    Bir marta render shell yoki manage.py shell orqali ishga tushiring.
    Allaqachon mavjud savollar (matni bo'yicha) o'tkazib yuboriladi —
    qaytalanmaydigan idempotent buyruq.
"""
from __future__ import annotations

import re
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.questions.models import Question


# Faqat `insert into questions ... values (...), (...), ...;` blokini topish uchun.
_INSERT_RE = re.compile(r"values\s*(.+?);", re.DOTALL | re.IGNORECASE)
_ROW_RE = re.compile(
    r"\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*\)"
)


def _unescape(value: str) -> str:
    return value.replace("''", "'")


def _parse_seed(path: Path) -> list[tuple[str, str, str, str]]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    match = _INSERT_RE.search(text)
    if not match:
        return []
    rows = _ROW_RE.findall(match.group(1))
    return [
        (_unescape(t), _unescape(a), _unescape(c), _unescape(d))
        for t, a, c, d in rows
    ]


class Command(BaseCommand):
    help = "seed.sql va seed_extra.sql fayllaridan savollarni bazaga yuklaydi (idempotent)."

    def handle(self, *args, **options):
        base = Path(__file__).resolve().parents[4]
        files = [base / "seed.sql", base / "seed_extra.sql"]

        all_rows: list[tuple[str, str, str, str]] = []
        for file in files:
            rows = _parse_seed(file)
            self.stdout.write(f"{file.name}: {len(rows)} ta savol topildi")
            all_rows.extend(rows)

        if not all_rows:
            self.stdout.write(self.style.WARNING("Hech qanday savol topilmadi"))
            return

        existing = set(Question.objects.values_list("text", flat=True))
        created = 0
        skipped = 0

        for text, answer, category, difficulty in all_rows:
            if text in existing:
                skipped += 1
                continue
            Question.objects.create(
                text=text,
                correct_answer=answer,
                category=category or None,
                difficulty=difficulty or None,
            )
            created += 1

        total = Question.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Yangi qo'shildi: {created} | O'tkazib yuborildi (dupes): {skipped} | Jami: {total}"
            )
        )
