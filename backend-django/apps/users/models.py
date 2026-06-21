from django.db import models
from django.utils import timezone


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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_premium_active(self) -> bool:
        """Premiumni tekshiradi: premium_until kelajakda bo'lsa True."""
        return self.premium_until is not None and self.premium_until > timezone.now()

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

    # To'lov yo'riqnomalari (karta raqami, Payme link va h.k.) — foydalanuvchiga
    # ko'rsatiladi, qayerga to'lash kerakligini tushuntiradi.
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

    def get_section(self, section: str) -> dict:
        """Bo'lim konfigini qaytaradi. Topilmasa yoki xato bo'lsa safe default."""
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
