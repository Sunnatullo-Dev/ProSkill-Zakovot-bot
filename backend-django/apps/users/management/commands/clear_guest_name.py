"""telegram_id=0 (umumiy mehmon) yozuvidagi ism maydonlarini tozalaydi.

Bu yozuv barcha mehmonlar tomonidan baham ko'riladi. Eski kod uning
ichiga "Sunnatulla" kabi ismni yozib qo'ygan bo'lsa — boshqa mehmonlar
ham shu nomni ko'rib qoladi. Production'dan keyin bir marta ishga
tushiring:

    # avval dry-run:
    python manage.py clear_guest_name
    # tasdiqlangach:
    python manage.py clear_guest_name --yes
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.users.models import User


class Command(BaseCommand):
    help = "telegram_id=0 yozuvining ism, familiya, username, display_name maydonlarini NULL ga o'rnatadi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Haqiqatan o'zgartirish (default: dry-run).",
        )

    def handle(self, *args, **options):
        do_apply = bool(options.get("yes"))

        user = User.objects.filter(telegram_id=0).first()
        if not user:
            self.stdout.write(self.style.WARNING("Mehmon yozuvi (telegram_id=0) topilmadi"))
            return

        before = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "display_name": user.display_name,
        }

        # Tozalanishi kerak bo'lgan maydonlar bormi?
        if not any(before.values()):
            self.stdout.write(self.style.SUCCESS("Mehmon yozuvi allaqachon toza"))
            return

        self.stdout.write("Topilgan mehmon yozuvi:")
        for key, value in before.items():
            self.stdout.write(f"  {key}: {value!r}")

        if not do_apply:
            self.stdout.write(
                self.style.WARNING(
                    "\n[DRY-RUN] Yuqoridagi maydonlar NULL ga o'rnatiladi. "
                    "Tasdiqlash uchun `--yes` flag bilan qayta ishga tushiring."
                )
            )
            return

        user.first_name = None
        user.last_name = None
        user.username = None
        user.display_name = None
        user.save(update_fields=["first_name", "last_name", "username", "display_name"])
        self.stdout.write(self.style.SUCCESS("Mehmon yozuvi tozalandi"))
