"""Supabase REST-API uchun yengil HTTP client.

Eski Node loyihasidagi `supabase-js` o'rnida ishlatamiz — faqat shu turdagi
metodlar kerak: select / insert / update / delete + ba'zi murakkab filter.
Service-role kaliti orqali RLS chetlab o'tiladi.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable
from urllib.parse import quote

import requests
from django.conf import settings

from .exceptions import AppError


_SESSION = requests.Session()
_DEFAULT_TIMEOUT = 15


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise AppError(500, "Supabase ulanish parametrlari sozlanmagan")

    base = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra:
        base.update(extra)
    return base


def _url(path: str) -> str:
    return f"{settings.SUPABASE_URL}/rest/v1/{path.lstrip('/')}"


@dataclass
class QueryBuilder:
    table: str
    params: list[tuple[str, str]] = field(default_factory=list)
    columns: str = "*"
    method: str = "GET"
    body: Any = None
    extra_headers: dict[str, str] = field(default_factory=dict)
    expect_single: bool = False

    def select(self, columns: str = "*") -> "QueryBuilder":
        self.columns = columns
        self.params.append(("select", columns))
        return self

    def eq(self, column: str, value: Any) -> "QueryBuilder":
        self.params.append((column, f"eq.{_encode_value(value)}"))
        return self

    def neq(self, column: str, value: Any) -> "QueryBuilder":
        self.params.append((column, f"neq.{_encode_value(value)}"))
        return self

    def gt(self, column: str, value: Any) -> "QueryBuilder":
        self.params.append((column, f"gt.{_encode_value(value)}"))
        return self

    def is_(self, column: str, value: str) -> "QueryBuilder":
        self.params.append((column, f"is.{value}"))
        return self

    def in_(self, column: str, values: Iterable[Any]) -> "QueryBuilder":
        joined = ",".join(_encode_value(value) for value in values)
        self.params.append((column, f"in.({joined})"))
        return self

    def or_(self, expression: str) -> "QueryBuilder":
        # Misol: "challenger_team_id.eq.X,opponent_team_id.eq.X"
        self.params.append(("or", f"({expression})"))
        return self

    def ilike(self, column: str, pattern: str) -> "QueryBuilder":
        self.params.append((column, f"ilike.{pattern}"))
        return self

    def order(self, column: str, ascending: bool = True) -> "QueryBuilder":
        direction = "asc" if ascending else "desc"
        self.params.append(("order", f"{column}.{direction}"))
        return self

    def limit(self, count: int) -> "QueryBuilder":
        self.params.append(("limit", str(count)))
        return self

    def range(self, start: int, end: int) -> "QueryBuilder":
        # Postgrest range = Range header.
        self.extra_headers["Range-Unit"] = "items"
        self.extra_headers["Range"] = f"{start}-{end}"
        return self

    def head_count(self) -> "QueryBuilder":
        # Faqat metadata, content qaytmaydi.
        self.extra_headers["Prefer"] = "count=exact"
        self.method = "HEAD"
        return self

    def with_count(self, mode: str = "exact") -> "QueryBuilder":
        self.extra_headers["Prefer"] = f"count={mode}"
        return self

    def single(self) -> "QueryBuilder":
        self.expect_single = True
        self.extra_headers["Accept"] = "application/vnd.pgrst.object+json"
        return self

    def maybe_single(self) -> "QueryBuilder":
        self.expect_single = True
        # PostgREST: agar bo'sh javob bo'lsa 200 va `null` qaytaradi.
        self.extra_headers["Accept"] = "application/vnd.pgrst.object+json"
        return self

    def returns_all(self) -> "QueryBuilder":
        self.extra_headers["Prefer"] = (
            (self.extra_headers.get("Prefer", "") + ",return=representation").strip(",")
        )
        return self

    # --- terminal operatsiyalar ---

    def insert(self, payload: Any) -> "QueryBuilder":
        self.method = "POST"
        self.body = payload
        self.extra_headers.setdefault("Prefer", "return=representation")
        return self

    def update(self, payload: dict[str, Any]) -> "QueryBuilder":
        self.method = "PATCH"
        self.body = payload
        self.extra_headers.setdefault("Prefer", "return=representation")
        return self

    def delete(self) -> "QueryBuilder":
        self.method = "DELETE"
        return self

    def upsert(self, payload: Any, on_conflict: str) -> "QueryBuilder":
        self.method = "POST"
        self.body = payload
        self.params.append(("on_conflict", on_conflict))
        self.extra_headers["Prefer"] = "return=representation,resolution=merge-duplicates"
        return self

    def execute(self) -> dict[str, Any]:
        url = _url(self.table)
        headers = _headers(self.extra_headers)
        response = _SESSION.request(
            self.method,
            url,
            params=self.params,
            json=self.body if self.body is not None else None,
            headers=headers,
            timeout=_DEFAULT_TIMEOUT,
        )

        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            return {
                "data": None,
                "error": detail,
                "status": response.status_code,
                "count": None,
            }

        count = _extract_count(response.headers.get("Content-Range"))

        if self.method == "HEAD" or response.status_code == 204 or not response.content:
            return {"data": None, "error": None, "status": response.status_code, "count": count}

        try:
            data = response.json()
        except ValueError:
            data = None

        if self.expect_single and isinstance(data, list):
            data = data[0] if data else None

        return {"data": data, "error": None, "status": response.status_code, "count": count}


def table(name: str) -> QueryBuilder:
    return QueryBuilder(table=name)


def _encode_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    return quote(str(value), safe="")


def _extract_count(header_value: str | None) -> int | None:
    if not header_value:
        return None
    # Format: "0-9/123" yoki "*/123"
    try:
        return int(header_value.split("/")[-1])
    except (ValueError, IndexError):
        return None
