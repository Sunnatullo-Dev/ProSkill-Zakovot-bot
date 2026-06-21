# Generated migration — premium grant tracking fields + payment_details

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_user_premium_until_premiumsettings"),
    ]

    operations = [
        # User — qaysi admin tasdiqlagan va qachon
        migrations.AddField(
            model_name="user",
            name="premium_granted_by_telegram_id",
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="premium_granted_by_name",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="premium_granted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # PremiumSettings — to'lov yo'riqnomalari
        migrations.AddField(
            model_name="premiumsettings",
            name="payment_details",
            field=models.TextField(
                blank=True,
                default="",
                help_text="To'lov ma'lumotlari: karta raqami, Payme/Click link, yo'riqnoma.",
            ),
        ),
    ]
