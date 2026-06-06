from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_add_app_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="svoyak_time_per_question",
            field=models.PositiveIntegerField(
                default=15,
                help_text="Svoyak'da har savol uchun vaqt (soniya, 5-60)",
            ),
        ),
    ]
