# Mobil ilova auth: telefon + parol + JWT token versiyasi.
#
# Mavjud Telegram foydalanuvchilariga ta'sir qilmaydi — barcha yangi ustunlar
# nullable yoki default qiymatga ega.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_user_score_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="E.164 formatda normallashtirilgan raqam, masalan +998901234567",
                max_length=20,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="email",
            field=models.EmailField(
                blank=True,
                help_text="Ixtiyoriy — parolni tiklash uchun",
                max_length=254,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="password_hash",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Django PBKDF2 hash. Bo'sh — parol o'rnatilmagan (faqat Telegram akkaunt).",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="auth_provider",
            field=models.CharField(
                choices=[
                    ("telegram", "Telegram"),
                    ("phone", "Telefon + parol"),
                    ("both", "Ikkalasi"),
                ],
                db_index=True,
                default="telegram",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="token_version",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="user",
            name="last_login_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
