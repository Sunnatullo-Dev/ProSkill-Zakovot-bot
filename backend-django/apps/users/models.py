from django.db import models
from django.utils import timezone


# Mobil ilova (telefon+parol) orqali ro'yxatdan o'tgan foydalanuvchilar uchun
# sintetik `telegram_id` shu asosdan boshlanadi.
#
# NEGA KERAK: butun kod bazasi foydalanuvchini `telegram_id` bo'yicha tanidi
# (jamoalar, o'yin natijalari, xonalar, reyting — hammasi shu ustunga bog'langan).
# Yangi ustun qo'shib hamma joyni o'zgartirish o'rniga, Telegramsiz akkauntlarga
# ham noyob musbat `telegram_id` beramiz — shunda mavjud mantiq o'zgarmaydi.
#
# XAVFSIZLIK: haqiqiy Telegram ID'lari bugungi kunda ~10^10 atrofida (Bot API
# ularni 52 bitgacha kafolatlaydi). 2*10^12 dan boshlash real ID bilan
# to'qnashuv ehtimolini amalda nolga tushiradi.
SYNTHETIC_TELEGRAM_ID_BASE = 2_000_000_000_000

AUTH_PROVIDER_TELEGRAM = "telegram"
AUTH_PROVIDER_PHONE = "phone"
AUTH_PROVIDER_BOTH = "both"
AUTH_PROVIDER_CHOICES = [
    (AUTH_PROVIDER_TELEGRAM, "Telegram"),
    (AUTH_PROVIDER_PHONE, "Telefon + parol"),
    (AUTH_PROVIDER_BOTH, "Ikkalasi"),
]


class User(models.Model):
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    # Leaderboard `score DESC` saralash uchun index — har leaderboard chaqiruvi
    # `get_user_rank` ham `score__gt` filter qiladi.
    score = models.IntegerField(default=0, db_index=True)
    unlocked_achievements = models.JSONField(default=list)
    referred_by = models.BigIntegerField(null=True, blank=True, db_index=True)
    # UI tili: 'uz-latn', 'uz-cyrl', 'ru'. Frontend localStorage'ga ham
    # yozadi (offline'da ishlashi uchun), ammo qurilmalararo sinxron uchun
    # ushbu maydon manba haqiqat hisoblanadi.
    language = models.CharField(max_length=10, default="uz-latn")
    current_streak = models.IntegerField(default=0)
    # Premium obuna: null → bepul foydalanuvchi; future datetime → aktiv premium.
    premium_until = models.DateTimeField(null=True, blank=True, db_index=True)
    # Kim tomonidan / qachon berilgan — to'lov tasdiqlovchi admin yoki qo'lda.
    premium_granted_by_telegram_id = models.BigIntegerField(null=True, blank=True)
    premium_granted_by_name = models.CharField(max_length=255, null=True, blank=True)
    premium_granted_at = models.DateTimeField(null=True, blank=True)
    # ── Mobil ilova hisob ma'lumotlari (telefon + parol) ─────────────────────
    # Telegram orqali kirgan foydalanuvchilarda bular bo'sh bo'ladi.
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        help_text="E.164 formatda normallashtirilgan raqam, masalan +998901234567",
    )
    email = models.EmailField(
        max_length=254,
        null=True,
        blank=True,
        unique=True,
        help_text="Ixtiyoriy — parolni tiklash uchun",
    )
    password_hash = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Django PBKDF2 hash. Bo'sh — parol o'rnatilmagan (faqat Telegram akkaunt).",
    )
    auth_provider = models.CharField(
        max_length=10,
        choices=AUTH_PROVIDER_CHOICES,
        default=AUTH_PROVIDER_TELEGRAM,
        db_index=True,
    )
    # Har o'zgarganda barcha chiqarilgan refresh tokenlar kuchini yo'qotadi
    # (parol almashtirilganda, "barcha qurilmalardan chiqish" bosilganda).
    token_version = models.PositiveIntegerField(default=0)
    last_login_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_premium_active(self) -> bool:
        """Premiumni tekshiradi: premium_until kelajakda bo'lsa True."""
        return self.premium_until is not None and self.premium_until > timezone.now()

    def is_app_account(self) -> bool:
        """Telegramsiz, faqat mobil ilova orqali yaratilgan akkauntmi?"""
        return self.telegram_id >= SYNTHETIC_TELEGRAM_ID_BASE

    def has_usable_password(self) -> bool:
        return bool(self.password_hash)

    def set_password(self, raw_password: str) -> None:
        """Parolni hash qilib yozadi (saqlamaydi — `save()` chaqirish kerak).

        Django'ning standart hasher'idan foydalanamiz (PBKDF2-SHA256).
        `django.contrib.auth.hashers` `AUTH_USER_MODEL` ga bog'liq emas —
        uni mustaqil ishlatish mumkin.
        """
        from django.contrib.auth.hashers import make_password

        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """Parolni tekshiradi. Hash eskirgan bo'lsa yangilab qo'yadi."""
        from django.contrib.auth.hashers import check_password

        if not self.password_hash:
            return False

        def _setter(new_hash: str) -> None:
            User.objects.filter(pk=self.pk).update(password_hash=new_hash)
            self.password_hash = new_hash

        return check_password(raw_password, self.password_hash, setter=_setter)

    def bump_token_version(self) -> None:
        """Barcha mavjud refresh tokenlarni bekor qiladi."""
        from django.db.models import F

        User.objects.filter(pk=self.pk).update(token_version=F("token_version") + 1)
        self.refresh_from_db(fields=["token_version"])

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.first_name or self.username or 'User'} ({self.telegram_id})"


PREMIUM_SETTINGS_CACHE_KEY = "premium_settings_v1"
PREMIUM_SETTINGS_CACHE_TTL = 60  # soniya


class PremiumSettings(models.Model):
    """Singleton qator — id=1 doim mavjud.

    Premium obuna tizimining global sozlamalari.
    enabled=False (default) → hech narsa o'zgarmaydi, mavjud o'yin buzilmaydi.
    Har bir bo'lim cheklovi alohida yoqiladi — faqat admin yoqqandan keyin ishlaydi.
    """

    # Master switch — False bo'lsa butun premium tizimi o'chirilgan.
    enabled = models.BooleanField(
        default=False,
        help_text="Premium tizimi yoqilganmi (False = hamma erkin, hech narsa o'zgarmaydi)",
    )

    # Ko'rsatish uchun narx (to'lov integratsiyasi yo'q, faqat UI uchun)
    price = models.PositiveIntegerField(default=0, help_text="Ko'rsatish narxi (to'lov yo'q)")
    currency = models.CharField(max_length=20, default="so'm")
    duration_days = models.PositiveIntegerField(
        default=30,
        help_text="Premium muddati (kun). Grant berishda default sifatida ishlatiladi.",
    )

    # Foydalanuvchiga ko'rinadigan foyda matni (premium ekrani uchun)
    benefits = models.TextField(blank=True, default="")

    # Strukturali to'lov ma'lumotlari — karta raqami va egasi (admin kiritadi,
    # foydalanuvchi nusxalab oladi).
    card_number = models.CharField(
        max_length=32,
        blank=True,
        default="",
        help_text="Karta raqami (masalan: 8600 1234 5678 9012). Foydalanuvchiga ko'rsatiladi.",
    )
    card_holder = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Karta egasi F.I.O (masalan: Aliyev Vali). Foydalanuvchiga ko'rsatiladi.",
    )

    # To'lov yo'riqnomalari — ixtiyoriy qo'shimcha izoh (Payme/Click link va h.k.)
    payment_details = models.TextField(
        blank=True,
        default="",
        help_text="To'lov ma'lumotlari: karta raqami, Payme/Click link, yo'riqnoma.",
    )

    # Bo'lim cheklovlari — har bir bo'lim uchun { limited: bool, free_limit: int }.
    # Default: barcha limited=false → cheksiz.
    # Noto'g'ri JSON bo'lsa safe default qaytariladi.
    section_limits = models.JSONField(
        default=dict,
        help_text=(
            "Bo'lim cheklovlari: {round, daily, battle, svoyak, gameroom} "
            "har biri {limited: bool, free_limit: int (kunlik)} strukturasida."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "premium_settings"

    def __str__(self) -> str:
        return f"Premium sozlamalari (enabled={self.enabled})"

    @classmethod
    def get(cls) -> "PremiumSettings":
        """Keshdan yoki DB'dan singleton sozlamalarni qaytaradi."""
        from django.core.cache import cache

        cached = cache.get(PREMIUM_SETTINGS_CACHE_KEY)
        if cached is not None:
            return cached
        obj, _ = cls.objects.get_or_create(id=1)
        cache.set(PREMIUM_SETTINGS_CACHE_KEY, obj, PREMIUM_SETTINGS_CACHE_TTL)
        return obj

    @classmethod
    def invalidate_cache(cls) -> None:
        from django.core.cache import cache
        cache.delete(PREMIUM_SETTINGS_CACHE_KEY)

    # Bepul foydalanuvchilar uchun standart kunlik limitlar.
    # Svoyak cheksiz — bu yerda yo'q.
    # Admin sozlamalarda bekor qilishi mumkin, lekin kalit bo'lmasa shu qiymatlar ishlaydi.
    _DEFAULT_SECTION_LIMITS: dict = {
        "round":    {"limited": True, "free_limit": 5},
        "daily":    {"limited": True, "free_limit": 5},
        "battle":   {"limited": True, "free_limit": 3},
        "gameroom": {"limited": True, "free_limit": 5},
    }

    def get_section(self, section: str) -> dict:
        """Bo'lim konfigini qaytaradi. Topilmasa — standart limitlarga qaytadi."""
        try:
            raw = self.section_limits
            if isinstance(raw, dict) and section in raw:
                cfg = raw[section]
                if isinstance(cfg, dict):
                    return {
                        "limited": bool(cfg.get("limited", False)),
                        "free_limit": max(0, int(cfg.get("free_limit", 0))),
                    }
        except Exception:
            pass
        # Admin sozlamasida kalit yo'q — standart limitni ishlatamiz
        default = self._DEFAULT_SECTION_LIMITS.get(section)
        if default:
            return dict(default)
        return {"limited": False, "free_limit": 0}

    def to_dict(self) -> dict:
        sections = {}
        for sec in ("round", "daily", "battle", "svoyak", "gameroom"):
            sections[sec] = self.get_section(sec)
        return {
            "enabled": self.enabled,
            "price": self.price,
            "currency": self.currency,
            "durationDays": self.duration_days,
            "benefits": self.benefits,
            "cardNumber": self.card_number,
            "cardHolder": self.card_holder,
            "paymentDetails": self.payment_details,
            "sections": sections,
        }


class BotAdmin(models.Model):
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    added_by = models.BigIntegerField()
    added_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "bot_admins"

    def __str__(self):
        return f"{self.first_name or self.username or 'Admin'} ({self.telegram_id})"


class MilestoneState(models.Model):
    """Singleton qator — id=1 doim mavjud.

    Qaysi foydalanuvchi milestoneigacha tabrik yuborilganligi saqlanadi.
    Deployment qayta ishga tushganda ham DB'da saqlanadi, shuning uchun
    bir xil milestone ikki marta hech qachon yuborilmaydi.
    """

    last_celebrated_user_milestone = models.PositiveIntegerField(
        default=0,
        help_text="Oxirgi tabrik yuborilgan foydalanuvchilar soni (100 ga karrali)",
    )

    class Meta:
        db_table = "milestone_state"

    def __str__(self) -> str:
        return f"Milestone: {self.last_celebrated_user_milestone}"


class TelegramLinkToken(models.Model):
    """Mobil ilova foydalanuvchisini Telegram hisobi bilan bir martalik xavfsiz bog'lash tokeni."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="telegram_link_tokens")
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    is_used = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by_telegram_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = "telegram_link_tokens"
        indexes = [
            models.Index(fields=["token_hash", "is_used"]),
        ]

    def __str__(self) -> str:
        return f"LinkToken for user {self.user_id} (used={self.is_used})"


class UserScoreLog(models.Model):
    """Har `add_score` chaqiruvida log yoziladi.

    Oylik reyting uchun: shu oy yig'ilgan ball summasi.
    Jadval kichik bo'lib qoladi — eski yozuvlar arxivlanishi mumkin.
    """
    telegram_id = models.BigIntegerField(db_index=True)
    amount = models.IntegerField()                         # qo'shilgan ball
    source = models.CharField(max_length=32, default="answer")  # "answer" | "achievement" | "streak"
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "user_score_log"
        indexes = [
            models.Index(fields=["telegram_id", "created_at"], name="score_log_tid_cat_idx"),
        ]

    def __str__(self) -> str:
        return f"UserScoreLog {self.telegram_id}: +{self.amount} ({self.source})"

