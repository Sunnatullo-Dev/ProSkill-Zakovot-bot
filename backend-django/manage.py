#!/usr/bin/env python
"""Zakovat Django management entry point."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zakovat.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django o'rnatilmagan — `pip install -r requirements.txt` ni ishga tushiring"
        ) from exc

    # migrate da URL check'larini o'tkazib yuborish — startup'ni tezlashtiradi
    # va pip paketlari to'liq o'rnatilmagan sharoitda ham ishlashga yordam beradi
    if len(sys.argv) > 1 and sys.argv[1] == "migrate" and "--skip-checks" not in sys.argv:
        sys.argv.insert(2, "--skip-checks")

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
