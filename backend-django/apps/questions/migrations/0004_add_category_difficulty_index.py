from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0003_question_time_limit_seconds"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="question",
            index=models.Index(
                fields=["category", "difficulty"],
                name="question_cat_diff_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="question",
            index=models.Index(
                fields=["difficulty"],
                name="question_diff_idx",
            ),
        ),
    ]
