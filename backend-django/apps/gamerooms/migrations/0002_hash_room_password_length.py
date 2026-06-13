from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gamerooms", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gameroom",
            name="join_password",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
