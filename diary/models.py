from django.db import models

# Create your models here.
class DiaryImage(models.Model):
    diary = models.ForeignKey(Diary, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    ai_prompt = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.diary.id}"
