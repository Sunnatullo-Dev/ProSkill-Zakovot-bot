# Generated migration for apps.gamerooms

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="GameRoom",
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
                ("code", models.CharField(db_index=True, max_length=6, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("admin_telegram_id", models.BigIntegerField(db_index=True)),
                ("extra_admin_ids", models.JSONField(blank=True, default=list)),
                ("join_password", models.CharField(blank=True, default="", max_length=50)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("waiting", "Kutish (lobby)"),
                            ("active", "O'yin jarayonda"),
                            ("finished", "Tugagan"),
                        ],
                        db_index=True,
                        default="waiting",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "O'yin xonasi",
                "verbose_name_plural": "O'yin xonalari",
                "db_table": "gameroom_room",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Participant",
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
                ("display_name", models.CharField(max_length=120)),
                ("total_points", models.IntegerField(default=0)),
                ("speed_score_ms", models.BigIntegerField(default=0)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="participants",
                        to="gamerooms.gameroom",
                    ),
                ),
            ],
            options={
                "verbose_name": "Ishtirokchi",
                "verbose_name_plural": "Ishtirokchilar",
                "db_table": "gameroom_participant",
                "ordering": ["-total_points", "speed_score_ms", "joined_at"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="participant",
            unique_together={("room", "telegram_id")},
        ),
        migrations.CreateModel(
            name="GameQuestion",
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
                    "question_type",
                    models.CharField(
                        choices=[
                            ("text", "Erkin matn"),
                            ("audio", "Audio"),
                            ("image", "Rasm"),
                        ],
                        default="text",
                        max_length=10,
                    ),
                ),
                ("body", models.TextField(help_text="Savol matni")),
                (
                    "media_ref",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="Telegram file_id yoki URL (audio/image uchun)",
                        max_length=500,
                    ),
                ),
                ("caption", models.CharField(blank=True, default="", max_length=500)),
                ("correct_answer", models.TextField(blank=True, default="")),
                (
                    "time_limit_seconds",
                    models.PositiveSmallIntegerField(
                        choices=[
                            (30, "30 soniya"),
                            (60, "60 soniya"),
                            (90, "90 soniya"),
                            (120, "120 soniya (default)"),
                            (180, "180 soniya"),
                        ],
                        default=120,
                        help_text="Javob vaqti (30/60/90/120/180 soniya)",
                    ),
                ),
                (
                    "point_value",
                    models.PositiveSmallIntegerField(
                        choices=[(1, "1 ball"), (2, "2 ball"), (3, "3 ball")],
                        default=1,
                        help_text="To'g'ri javob uchun ball (1/2/3)",
                    ),
                ),
                (
                    "order_index",
                    models.PositiveIntegerField(
                        db_index=True,
                        default=0,
                        help_text="Push tartibidagi raqam",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Kutilmoqda"),
                            ("active", "Aktiv (ochiq)"),
                            ("closed", "Yopilgan"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=10,
                    ),
                ),
                ("is_bonus", models.BooleanField(default=False)),
                ("is_quick", models.BooleanField(default=False)),
                ("activated_at", models.DateTimeField(blank=True, null=True)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "bank_question_id",
                    models.BigIntegerField(
                        blank=True,
                        db_index=True,
                        help_text="apps.questions modelidagi savolning ID'si (saqlangan bo'lsa)",
                        null=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="questions",
                        to="gamerooms.gameroom",
                    ),
                ),
            ],
            options={
                "verbose_name": "O'yin savoli",
                "verbose_name_plural": "O'yin savollari",
                "db_table": "gameroom_question",
                "ordering": ["order_index", "created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="gamequestion",
            index=models.Index(fields=["room", "status"], name="gameroom_q_room_status_idx"),
        ),
        migrations.AddIndex(
            model_name="gamequestion",
            index=models.Index(
                fields=["room", "order_index"], name="gameroom_q_room_order_idx"
            ),
        ),
        # GameRoom.current_question FK — GameQuestion yaratilgandan keyin qo'shiladi
        migrations.AddField(
            model_name="gameroom",
            name="current_question",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="gamerooms.gamequestion",
            ),
        ),
        migrations.CreateModel(
            name="Submission",
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
                ("answer_text", models.TextField()),
                ("is_correct", models.BooleanField(blank=True, null=True)),
                (
                    "points_awarded",
                    models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                (
                    "graded_by",
                    models.CharField(
                        blank=True,
                        default="",
                        help_text="'auto' yoki 'manual' — null bo'lsa hali baholanmagan",
                        max_length=10,
                    ),
                ),
                (
                    "grading_note",
                    models.CharField(blank=True, default="", max_length=300),
                ),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "participant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="submissions",
                        to="gamerooms.participant",
                    ),
                ),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="submissions",
                        to="gamerooms.gamequestion",
                    ),
                ),
            ],
            options={
                "verbose_name": "Javob",
                "verbose_name_plural": "Javoblar",
                "db_table": "gameroom_submission",
            },
        ),
        migrations.AlterUniqueTogether(
            name="submission",
            unique_together={("question", "participant")},
        ),
        migrations.AddIndex(
            model_name="submission",
            index=models.Index(
                fields=["question", "participant"], name="gameroom_sub_q_p_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="submission",
            index=models.Index(
                fields=["question", "is_correct"], name="gameroom_sub_q_correct_idx"
            ),
        ),
    ]
