from django.db import models


class GameResult(models.Model):
    telegram_id = models.BigIntegerField(db_index=True)
    correct_count = models.IntegerField(default=0)
    total_count = models.IntegerField(default=0)
    round_score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "game_results"
