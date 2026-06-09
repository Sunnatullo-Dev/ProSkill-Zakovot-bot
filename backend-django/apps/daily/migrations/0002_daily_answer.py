from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('daily', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyAnswer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('telegram_id', models.BigIntegerField(db_index=True)),
                ('date', models.DateField()),
                ('question_id', models.CharField(max_length=36)),
                ('is_correct', models.BooleanField()),
                ('points_earned', models.IntegerField(default=0)),
                ('answered_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'daily_answers'},
        ),
        migrations.AddConstraint(
            model_name='dailyanswer',
            constraint=models.UniqueConstraint(
                fields=['telegram_id', 'date', 'question_id'],
                name='unique_daily_answer_per_question',
            ),
        ),
    ]
