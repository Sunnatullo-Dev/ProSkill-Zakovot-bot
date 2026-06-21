# Generated migration — PremiumRequest model

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PremiumRequest",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("telegram_id", models.BigIntegerField(db_index=True)),
                ("display_name", models.CharField(blank=True, default="", max_length=255)),
                ("username", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Kutilmoqda"),
                            ("approved", "Tasdiqlandi"),
                            ("rejected", "Rad etildi"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("receipt_file_id", models.CharField(max_length=255)),
                ("receipt_media_type", models.CharField(default="image", max_length=20)),
                ("amount", models.PositiveIntegerField(default=0)),
                ("currency", models.CharField(default="so'm", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("reviewed_by_telegram_id", models.BigIntegerField(blank=True, null=True)),
                (
                    "reviewed_by_name",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("reject_reason", models.TextField(blank=True, default="")),
                ("granted_until", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "db_table": "premium_requests",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="premiumrequest",
            index=models.Index(
                fields=["status", "created_at"],
                name="premium_req_status_2ad0d6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="premiumrequest",
            index=models.Index(
                fields=["telegram_id", "status"],
                name="premium_req_telegra_9b9ab6_idx",
            ),
        ),
    ]
