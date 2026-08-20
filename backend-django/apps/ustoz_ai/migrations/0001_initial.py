from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Subject",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(db_index=True, max_length=120)),
                ("icon_emoji", models.CharField(blank=True, default="📚", max_length=10)),
                ("description", models.TextField(blank=True, default="")),
                ("order", models.PositiveIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.BigIntegerField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Fan",
                "verbose_name_plural": "Fanlar",
                "db_table": "ustoz_subject",
                "ordering": ["order", "name"],
            },
        ),
        migrations.CreateModel(
            name="Lesson",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("subject", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="lessons",
                    to="ustoz_ai.subject",
                )),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("order", models.PositiveIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.BigIntegerField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Dars",
                "verbose_name_plural": "Darslar",
                "db_table": "ustoz_lesson",
                "ordering": ["order", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="lesson",
            index=models.Index(
                fields=["subject", "is_active", "order"],
                name="ustoz_lesson_sub_act_idx",
            ),
        ),
        migrations.CreateModel(
            name="UstozQuestion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("lesson", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="questions",
                    to="ustoz_ai.lesson",
                )),
                ("text", models.TextField(help_text="Savol matni")),
                ("option_a", models.CharField(max_length=500)),
                ("option_b", models.CharField(max_length=500)),
                ("option_c", models.CharField(max_length=500)),
                ("option_d", models.CharField(max_length=500)),
                ("correct_option", models.CharField(
                    choices=[("a", "A"), ("b", "B"), ("c", "C"), ("d", "D")],
                    help_text="To'g'ri javob: a, b, c yoki d",
                    max_length=1,
                )),
                ("explanation", models.TextField(blank=True, default="", help_text="To'g'ri javob izoh")),
                ("order", models.PositiveIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.BigIntegerField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Ustoz AI Savol",
                "verbose_name_plural": "Ustoz AI Savollar",
                "db_table": "ustoz_question",
                "ordering": ["order", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="ustozquestion",
            index=models.Index(
                fields=["lesson", "is_active", "order"],
                name="ustoz_q_les_act_idx",
            ),
        ),
    ]
