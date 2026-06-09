from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_language'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='current_streak',
            field=models.IntegerField(default=0),
        ),
    ]
