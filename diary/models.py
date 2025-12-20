from django.db import models
from django.contrib.auth.models import User


class Diary(models.Model):
    """
    일기 모델
    - 내용은 암호화되어 저장됨
    - AI 감정 분석 결과 포함
    """
    
    # 감정 선택지
    EMOTION_CHOICES = [
        ('happy', '행복'),
        ('sad', '슬픔'),
        ('angry', '화남'),
        ('anxious', '불안'),
        ('peaceful', '평온'),
        ('excited', '신남'),
        ('tired', '피곤'),
        ('love', '사랑'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()  # 암호화된 상태로 저장
    is_encrypted = models.BooleanField(default=True)  # 암호화 여부
    
    # 감정 분석 필드
    emotion = models.CharField(
        max_length=20,
        choices=EMOTION_CHOICES,
        null=True,
        blank=True,
        verbose_name='감정'
    )
    emotion_score = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='감정 강도',
        help_text='0-100 사이의 값'
    )
    emotion_analyzed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='감정 분석 시간'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = '일기'
        verbose_name_plural = '일기들'

    def __str__(self):
        return f"{self.title} ({self.created_at.strftime('%Y-%m-%d')})"
    
    def get_emotion_display_emoji(self) -> str:
        """감정에 해당하는 이모지 반환"""
        emoji_map = {
            'happy': '😊',
            'sad': '😢',
            'angry': '😡',
            'anxious': '😰',
            'peaceful': '😌',
            'excited': '🥳',
            'tired': '😴',
            'love': '🥰',
        }
        return emoji_map.get(self.emotion, '')

    def encrypt_content(self, plain_content: str) -> None:
        """내용을 암호화하여 저장"""
        from .encryption import get_encryption_service
        service = get_encryption_service()
        if service.is_enabled:
            self.content = service.encrypt(plain_content)
            self.is_encrypted = True
        else:
            self.content = plain_content
            self.is_encrypted = False

    def decrypt_content(self) -> str:
        """암호화된 내용을 복호화하여 반환"""
        if not self.is_encrypted:
            return self.content
        
        from .encryption import get_encryption_service
        service = get_encryption_service()
        return service.decrypt(self.content)


class DiaryImage(models.Model):
    """AI 생성 이미지"""
    diary = models.ForeignKey(Diary, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    ai_prompt = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.diary.id}"


