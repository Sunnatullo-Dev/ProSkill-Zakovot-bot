from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Admin panel URL manzilini ko'rsatadi"

    def handle(self, *args, **options):
        path = getattr(settings, "ADMIN_SECRET_PATH", "???")
        self.stdout.write(self.style.SUCCESS(f"\nAdmin panel URL: /{path}/\n"))
