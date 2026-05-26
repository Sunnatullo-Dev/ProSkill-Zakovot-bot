from django.db import models


class TtsCache(models.Model):
    """Savol matni uchun bir marta generate qilingan audio keshlash."""

    text_hash = models.CharField(max_length=64, primary_key=True)
    audio_b64 = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tts_cache"
