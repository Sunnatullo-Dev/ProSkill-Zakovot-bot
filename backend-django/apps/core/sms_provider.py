"""SMS xizmatlari provayderi abstraksiyasi.

Ushbu modul SMS xizmatlari uchun yagona interfeys taqdim etadi:
- Eskiz.uz (O'zbekiston)
- PlayMobile (O'zbekiston)
- Twilio (Xalqaro)
- DisabledSmsProvider (SMS konfiguratsiyasi bo'lmaganda)

Xavfsizlik qoidalari:
1. Hech qachon Telegram xabarini SMS deb da'vo qilmang.
2. Hech qachon haqiqiy SMS ketmagan bo'lsa "SMS yuborildi" deb hisobot bermang.
3. API kalitlar yoki tokenlar kod ichida saqlanmaydi (faqat env orqali o'qiladi).
4. OTP yoki maxfiy kodlar hech qachon loglarga yozilmaydi.
"""
from __future__ import annotations

import abc
import dataclasses
import logging
import os
from typing import Optional

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


@dataclasses.dataclass(frozen=True)
class SmsResult:
    """SMS yuborish natijasi."""

    success: bool
    provider: str
    message_id: Optional[str] = None
    error: Optional[str] = None


class BaseSmsProvider(abc.ABC):
    """Barcha SMS provayderlar uchun asosiy sinf."""

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Provayder nomi."""
        pass

    @property
    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Provayder to'liq sozlanganmi va ishlashga tayyormi."""
        pass

    @abc.abstractmethod
    def send_sms(self, *, phone: str, text: str) -> SmsResult:
        """SMS yuborish.

        Muhim: `text` ichida OTP bo'lishi mumkin, shuning uchun uni logga yozmang!
        """
        pass


class DisabledSmsProvider(BaseSmsProvider):
    """SMS provayder sozlanmagan holat uchun xavfsiz zaxira provayder."""

    @property
    def name(self) -> str:
        return "disabled"

    @property
    def is_configured(self) -> bool:
        return False

    def send_sms(self, *, phone: str, text: str) -> SmsResult:
        return SmsResult(
            success=False,
            provider=self.name,
            error="SMS xizmati sozlanmagan. Tasdiqlash Telegram bot orqali amalga oshiriladi.",
        )


class EskizSmsProvider(BaseSmsProvider):
    """Eskiz.uz SMS provayderi (O'zbekiston).

    Kerakli o'zgaruvchilar:
    - ESKIZ_EMAIL
    - ESKIZ_PASSWORD
    """

    AUTH_URL = "https://notify.eskiz.uz/api/auth/login"
    SEND_URL = "https://notify.eskiz.uz/api/message/sms/send"

    def __init__(self, email: str, password: str, from_name: str = "4546"):
        self._email = email
        self._password = password
        self._from_name = from_name
        self._token: Optional[str] = None

    @property
    def name(self) -> str:
        return "eskiz"

    @property
    def is_configured(self) -> bool:
        return bool(self._email and self._password)

    def _get_token(self) -> Optional[str]:
        if self._token:
            return self._token
        try:
            resp = requests.post(
                self.AUTH_URL,
                data={"email": self._email, "password": self._password},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                self._token = data.get("data", {}).get("token")
                return self._token
            logger.warning("eskiz_auth_failed: status=%d", resp.status_code)
        except Exception as exc:
            logger.warning("eskiz_auth_exception: %s", exc)
        return None

    def send_sms(self, *, phone: str, text: str) -> SmsResult:
        if not self.is_configured:
            return SmsResult(success=False, provider=self.name, error="Eskiz hisob ma'lumotlari kiritilmagan")

        token = self._get_token()
        if not token:
            return SmsResult(success=False, provider=self.name, error="Eskiz avtorizatsiyadan o'tib bo'lmadi")

        clean_phone = phone.lstrip("+").strip()
        try:
            resp = requests.post(
                self.SEND_URL,
                headers={"Authorization": f"Bearer {token}"},
                data={
                    "mobile_phone": clean_phone,
                    "message": text,
                    "from": self._from_name,
                },
                timeout=10,
            )
            if resp.status_code == 200:
                res_data = resp.json()
                msg_id = str(res_data.get("id", ""))
                return SmsResult(success=True, provider=self.name, message_id=msg_id)
            return SmsResult(
                success=False,
                provider=self.name,
                error=f"Eskiz xatolik qaytardi: HTTP {resp.status_code}",
            )
        except Exception as exc:
            logger.error("eskiz_send_error: %s", exc)
            return SmsResult(success=False, provider=self.name, error="SMS yuborishda tarmoq xatosi yuz berdi")


class PlayMobileSmsProvider(BaseSmsProvider):
    """PlayMobile SMS provayderi (O'zbekiston).

    Kerakli o'zgaruvchilar:
    - PLAYMOBILE_USERNAME
    - PLAYMOBILE_PASSWORD
    - PLAYMOBILE_ORIGINATOR
    """

    SEND_URL = "https://send.smsxabar.uz/broker-api/send"

    def __init__(self, username: str, password: str, originator: str = "Zakovat"):
        self._username = username
        self._password = password
        self._originator = originator

    @property
    def name(self) -> str:
        return "playmobile"

    @property
    def is_configured(self) -> bool:
        return bool(self._username and self._password)

    def send_sms(self, *, phone: str, text: str) -> SmsResult:
        if not self.is_configured:
            return SmsResult(success=False, provider=self.name, error="PlayMobile ma'lumotlari kiritilmagan")

        clean_phone = phone.lstrip("+").strip()
        payload = {
            "messages": [
                {
                    "recipient": clean_phone,
                    "message-id": f"zakovat_{os.urandom(8).hex()}",
                    "sms": {
                        "originator": self._originator,
                        "content": {"text": text},
                    },
                }
            ]
        }
        try:
            resp = requests.post(
                self.SEND_URL,
                auth=(self._username, self._password),
                json=payload,
                timeout=10,
            )
            if resp.status_code in (200, 201, 202):
                return SmsResult(success=True, provider=self.name)
            return SmsResult(
                success=False,
                provider=self.name,
                error=f"PlayMobile HTTP {resp.status_code}",
            )
        except Exception as exc:
            logger.error("playmobile_send_error: %s", exc)
            return SmsResult(success=False, provider=self.name, error="Tarmoq xatosi")


class TwilioSmsProvider(BaseSmsProvider):
    """Twilio SMS provayderi (Xalqaro).

    Kerakli o'zgaruvchilar:
    - TWILIO_ACCOUNT_SID
    - TWILIO_AUTH_TOKEN
    - TWILIO_FROM_NUMBER
    """

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self._sid = account_sid
        self._token = auth_token
        self._from_number = from_number

    @property
    def name(self) -> str:
        return "twilio"

    @property
    def is_configured(self) -> bool:
        return bool(self._sid and self._token and self._from_number)

    def send_sms(self, *, phone: str, text: str) -> SmsResult:
        if not self.is_configured:
            return SmsResult(success=False, provider=self.name, error="Twilio ma'lumotlari kiritilmagan")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self._sid}/Messages.json"
        try:
            resp = requests.post(
                url,
                auth=(self._sid, self._token),
                data={"To": phone, "From": self._from_number, "Body": text},
                timeout=10,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return SmsResult(success=True, provider=self.name, message_id=data.get("sid"))
            return SmsResult(
                success=False,
                provider=self.name,
                error=f"Twilio HTTP {resp.status_code}",
            )
        except Exception as exc:
            logger.error("twilio_send_error: %s", exc)
            return SmsResult(success=False, provider=self.name, error="Tarmoq xatosi")


_global_provider: Optional[BaseSmsProvider] = None


def get_sms_provider() -> BaseSmsProvider:
    """Tizimda sozlangan SMS provayderni qaytaradi."""
    global _global_provider
    if _global_provider is not None:
        return _global_provider

    provider_name = getattr(settings, "SMS_PROVIDER", None) or os.getenv("SMS_PROVIDER", "").lower()

    if provider_name == "eskiz":
        email = os.getenv("ESKIZ_EMAIL", "")
        password = os.getenv("ESKIZ_PASSWORD", "")
        from_name = os.getenv("ESKIZ_FROM_NAME", "4546")
        provider = EskizSmsProvider(email=email, password=password, from_name=from_name)
    elif provider_name == "playmobile":
        user = os.getenv("PLAYMOBILE_USERNAME", "")
        pwd = os.getenv("PLAYMOBILE_PASSWORD", "")
        orig = os.getenv("PLAYMOBILE_ORIGINATOR", "Zakovat")
        provider = PlayMobileSmsProvider(username=user, password=pwd, originator=orig)
    elif provider_name == "twilio":
        sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        from_num = os.getenv("TWILIO_FROM_NUMBER", "")
        provider = TwilioSmsProvider(account_sid=sid, auth_token=token, from_number=from_num)
    else:
        provider = DisabledSmsProvider()

    _global_provider = provider
    return provider


def is_sms_available() -> bool:
    """SMS yuborish imkoni mavjudmi (provayder sozlanganmi)."""
    return get_sms_provider().is_configured


def send_verification_sms(phone: str, otp: str, purpose: str = "register") -> SmsResult:
    """Tasdiqlash kodi uchun SMS yuboradi.

    Xavfsizlik: OTP hech qachon loglarga yozilmaydi.
    """
    provider = get_sms_provider()
    if not provider.is_configured:
        return SmsResult(
            success=False,
            provider="none",
            error="SMS xizmati faol emas. Iltimos, tasdiqlash uchun Telegram botimizdan foydalaning.",
        )

    action = "ro'yxatdan o'tish" if purpose == "register" else "parolni tiklash"
    text = f"Zakovat ilovasida {action} uchun tasdiqlash kodi: {otp}. Ushbu kodni hech kimga bermang."

    logger.info("sms_sending_attempt: provider=%s purpose=%s", provider.name, purpose)
    return provider.send_sms(phone=phone, text=text)
