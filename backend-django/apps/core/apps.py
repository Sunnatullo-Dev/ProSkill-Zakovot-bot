from django.apps import AppConfig
from django.db.backends.signals import connection_created


class CoreConfig(AppConfig):
    name = "apps.core"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        # SQLite uchun WAL rejimini yoqamiz — bir nechta worker bilan
        # concurrent yozish vaqtida "database is locked" xatolarini kamaytiradi.
        connection_created.connect(_enable_sqlite_wal)
        _patch_py314_context_copy()


def _patch_py314_context_copy():
    """Python 3.14 da BaseContext.__copy__ super() chaqiruvidagi xatoni tuzatish."""
    try:
        from django.template.context import BaseContext

        def _safe_context_copy(self):
            cls = self.__class__
            dup = cls.__new__(cls)
            dup.dicts = self.dicts[:]
            return dup

        BaseContext.__copy__ = _safe_context_copy
    except Exception:
        pass


def _enable_sqlite_wal(sender, connection, **kwargs):
    if connection.vendor != "sqlite":
        return
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
