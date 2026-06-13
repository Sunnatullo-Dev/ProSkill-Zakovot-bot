from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("channels", "0001_initial"),
        ("users", "0005_user_current_streak"),
    ]

    operations = [
        migrations.AddField(
            model_name="requiredchannel",
            name="passed_users",
            field=models.ManyToManyField(
                blank=True,
                help_text="Kanalga obunadan o'tgan foydalanuvchilar",
                related_name="passed_channels",
                to="users.user",
            ),
        ),
    ]
