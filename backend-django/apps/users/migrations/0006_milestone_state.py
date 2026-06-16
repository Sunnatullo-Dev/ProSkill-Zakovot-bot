from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_user_current_streak"),
    ]

    operations = [
        migrations.CreateModel(
            name="MilestoneState",
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
                (
                    "last_celebrated_user_milestone",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Oxirgi tabrik yuborilgan foydalanuvchilar soni (100 ga karrali)",
                    ),
                ),
            ],
            options={
                "db_table": "milestone_state",
            },
        ),
    ]
