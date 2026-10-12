"""Public Account Deletion Request View (Google Play Store & GDPR compliance).

Manzil: /delete-account
Xususiyatlar:
- Barcha foydalanuvchilar uchun ochiq, mobil ilovani o'rnatish talab qilinmaydi.
- Shaxsni tasdiqlash kafolati (begona odamning hisobi o'chirilishiga yo'l qo'ymaydi).
- Ikkala usulni qo'llab-quvvatlaydi:
    1. Parol orqali zudlik bilan tasdiqlash
    2. Telegram OTP orqali tasdiqlash
- HTML forma hamda AJAX/JSON so'rovlarini birdek qayta ishlaydi.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from apps.core.exceptions import AppError
from apps.users.deletion_service import (
    confirm_deletion_with_otp,
    delete_with_password,
    start_deletion_otp_flow,
)

logger = logging.getLogger(__name__)


def get_client_ip(request: HttpRequest) -> str:
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def _parse_body(request: HttpRequest) -> dict[str, Any]:
    if request.content_type == "application/json":
        try:
            return json.loads(request.body.decode("utf-8"))
        except Exception:
            return {}
    return request.POST.dict()


@csrf_exempt
def delete_account_view(request: HttpRequest) -> HttpResponse:
    """Public webpage and submission endpoint for account deletion at /delete-account."""
    context: dict[str, Any] = {
        "page_title": "Account & Data Deletion Request — Zakovat App",
        "app_name": "Zakovat App",
        "support_email": "support@zakovat-app.uz",
        "bot_username": "ZakovatApp_bot",
        "error_message": None,
        "success_message": None,
        "otp_step": False,
        "session_token": None,
        "deep_link": None,
        "identifier": "",
    }

    is_json = (
        request.content_type == "application/json"
        or request.headers.get("x-requested-with") == "XMLHttpRequest"
        or "application/json" in request.headers.get("accept", "")
    )

    if request.method in ("GET", "HEAD"):
        resp = render(request, "delete_account.html", context)
        resp["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp["X-Frame-Options"] = "SAMEORIGIN"
        resp["X-Content-Type-Options"] = "nosniff"
        return resp

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    data = _parse_body(request)
    action = data.get("action", "").strip()
    ip = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")

    try:
        if action == "delete_password":
            identifier = data.get("identifier", "").strip()
            password = data.get("password", "").strip()
            reason = data.get("reason", "").strip()

            result = delete_with_password(
                identifier=identifier,
                password=password,
                reason=reason,
                ip=ip,
                user_agent=user_agent,
            )

            if is_json:
                return JsonResponse(result)

            context["success_message"] = (
                "Hisobingiz va barcha shaxsiy ma'lumotlaringiz muvaffaqiyatli o'chirildi. "
                "Zakovat xizmatidan foydalanganingiz uchun rahmat."
            )
            return render(request, "delete_account.html", context)

        elif action == "request_otp":
            identifier = data.get("identifier", "").strip()
            reason = data.get("reason", "").strip()

            result = start_deletion_otp_flow(
                identifier=identifier,
                reason=reason,
                ip=ip,
                user_agent=user_agent,
            )

            if is_json:
                return JsonResponse(result)

            context["otp_step"] = True
            context["session_token"] = result.get("sessionToken")
            context["deep_link"] = result.get("deepLink")
            context["identifier"] = identifier
            context["info_message"] = (
                "Tasdiqlash so'rovi yaratildi. Iltimos, Telegram botimizni oching va tasdiqlash kodini oling."
            )
            return render(request, "delete_account.html", context)

        elif action == "confirm_otp":
            session_token = data.get("sessionToken", "").strip()
            otp = data.get("otp", "").strip()

            result = confirm_deletion_with_otp(
                session_token=session_token,
                otp=otp,
                ip=ip,
                user_agent=user_agent,
            )

            if is_json:
                return JsonResponse(result)

            context["success_message"] = (
                "Hisobingiz va unga bog'langan barcha ma'lumotlar muvaffaqiyatli o'chirildi."
            )
            return render(request, "delete_account.html", context)

        else:
            raise AppError(400, "Noto'g'ri amal (action) tanlandi")

    except AppError as e:
        if is_json:
            return JsonResponse({"ok": False, "message": str(e.message)}, status=e.status_code)
        context["error_message"] = str(e.message)
        context["identifier"] = data.get("identifier", "")
        if action == "confirm_otp":
            context["otp_step"] = True
            context["session_token"] = data.get("sessionToken", "")
        return render(request, "delete_account.html", context, status=e.status_code)

    except Exception as e:
        logger.exception("account_deletion_view_error: %s", e)
        msg = "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki qo'llab-quvvatlash xizmatiga murojaat qiling."
        if is_json:
            return JsonResponse({"ok": False, "message": msg}, status=500)
        context["error_message"] = msg
        return render(request, "delete_account.html", context, status=500)
