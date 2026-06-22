# Generated migration — structured payment fields: card_number + card_holder

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0008_user_premium_grant_fields_premiumsettings_payment_details"),
    ]

    operations = [
        migrations.AddField(
            model_name="premiumsettings",
            name="card_number",
            field=models.CharField(
                blank=True,
                default="",
                max_length=32,
                help_text="Karta raqami (masalan: 8600 1234 5678 9012). Foydalanuvchiga ko'rsatiladi.",
            ),
        ),
        migrations.AddField(
            model_name="premiumsettings",
            name="card_holder",
            field=models.CharField(
                blank=True,
                default="",
                max_length=255,
                help_text="Karta egasi F.I.O (masalan: Aliyev Vali). Foydalanuvchiga ko'rsatiladi.",
            ),
        ),
    ]
