"""Mehmon foydalanuvchi (telegram_id=0) yaratgan yoki a'zo bo'lgan jamoalarni o'chirish.

Bu yozuvlar barcha mehmonlar tomonidan baham ko'riladi. Eski kod telegram_id=0
ostida jamoa yaratgan/qo'shilgan bo'lsa — har bir mehmon shu jamoani o'ziniki
deb ko'rib qoladi. Production'dan keyin bir marta ishga tushiring:

    # avval dry-run (xavfsiz):
    python manage.py clear_guest_team
    # tasdiqlangach, --yes bilan haqiqatan o'chiriladi:
    python manage.py clear_guest_team --yes
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.teams.models import Team, TeamMember


class Command(BaseCommand):
    help = "Mehmon (telegram_id=0) bilan bog'liq jamoalarni va a'zoliklarni o'chiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Haqiqatan o'chirish (default: dry-run, hech narsa o'chmaydi).",
        )

    def handle(self, *args, **options):
        do_delete = bool(options.get("yes"))

        guest_owned_teams = Team.objects.filter(owner_id=0)
        owned_count = guest_owned_teams.count()
        for team in guest_owned_teams:
            self.stdout.write(f"  topildi: {team.name} ({team.code})")

        guest_memberships = TeamMember.objects.filter(telegram_id=0)
        memb_count = guest_memberships.count()

        if not do_delete:
            self.stdout.write(
                self.style.WARNING(
                    f"\n[DRY-RUN] {owned_count} ta mehmon-jamoa va {memb_count} ta mehmon a'zoligi "
                    "o'chiriladi. Tasdiqlash uchun `--yes` flag bilan qayta ishga tushiring."
                )
            )
            return

        guest_owned_teams.delete()
        guest_memberships.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {owned_count} ta jamoa (mehmon egasi), "
                f"{memb_count} ta mehmon a'zoligi."
            )
        )
