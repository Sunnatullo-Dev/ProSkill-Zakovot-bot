"""Mehmon foydalanuvchi (telegram_id=0) yaratgan yoki a'zo bo'lgan jamoalarni o'chirish.

Bu yozuvlar barcha mehmonlar tomonidan baham ko'riladi. Eski kod telegram_id=0
ostida jamoa yaratgan/qo'shilgan bo'lsa — har bir mehmon shu jamoani o'ziniki
deb ko'rib qoladi. Production'dan keyin bir marta ishga tushiring:

    python manage.py clear_guest_team
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.teams.models import Team, TeamMember


class Command(BaseCommand):
    help = "Mehmon (telegram_id=0) bilan bog'liq jamoalarni va a'zoliklarni o'chiradi."

    def handle(self, *args, **options):
        # 1) Mehmon egasi bo'lgan jamoalar
        guest_owned_teams = Team.objects.filter(owner_id=0)
        owned_count = guest_owned_teams.count()
        for team in guest_owned_teams:
            self.stdout.write(f"  o'chirilmoqda: {team.name} ({team.code})")
        guest_owned_teams.delete()

        # 2) Mehmonlar bo'lgan a'zoliklar (lekin jamoasi mehmonniki emas)
        guest_memberships = TeamMember.objects.filter(telegram_id=0)
        memb_count = guest_memberships.count()
        guest_memberships.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"O'chirildi: {owned_count} ta jamoa (mehmon egasi), "
                f"{memb_count} ta mehmon a'zoligi."
            )
        )
