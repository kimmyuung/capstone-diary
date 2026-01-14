# diary/models/diary.py
"""
일기 관련 모델
- Diary: 일기 본문 (암호화)
- DiaryImage: AI 생성 이미지
"""
from django.db import models
from django.contrib.auth.models import User


class Diary(models.Model):
    """
    일기 모델
    - 내용은 암호화되어 저장됨
    - AI 감정 분석 결과 포함
    """
    
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
    is_encrypted = models.BooleanField(default=True)
    encryption_version = models.IntegerField(default=1, verbose_name='암호화 버전') # Feature: Explicit Versioning
    
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
    
    # 위치 정보 필드
    location_name = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        verbose_name='장소명'
    )
    latitude = models.FloatField(null=True, blank=True, verbose_name='위도')
    latitude = models.FloatField(null=True, blank=True, verbose_name='위도')
    latitude = models.FloatField(null=True, blank=True, verbose_name='위도')
    longitude = models.FloatField(null=True, blank=True, verbose_name='경도')

    # 검색용 키워드 (Feature: Option A - Exact Match)
    search_keywords = models.TextField(null=True, blank=True, verbose_name='검색 키워드 (암호화 X)')

    # AI 회고 질문 및 답변 (Feature 1)
    reflection_question = models.TextField(null=True, blank=True, verbose_name='회고 질문')
    reflection_answer = models.TextField(null=True, blank=True, verbose_name='회고 답변')

    # 음성 기록 파일 (Feature 4)
    voice_file = models.FileField(upload_to='voice/', null=True, blank=True, verbose_name='음성 파일')
    
    # STT (Feature 7)
    transcription = models.TextField(null=True, blank=True, verbose_name='음성 변환 텍스트')
    is_transcribing = models.BooleanField(default=False, verbose_name='변환 중 여부')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # 동기화 충돌 방지를 위한 버전 (Optimistic Locking)
    version = models.IntegerField(default=1, verbose_name='버전')

    class Meta:
        ordering = ['-created_at']
        verbose_name = '일기'
        verbose_name_plural = '일기들'
        indexes = [
            models.Index(fields=['user', '-created_at'], name='diary_user_created_idx'),
            models.Index(fields=['user', 'emotion'], name='diary_user_emotion_idx'),
            models.Index(fields=['created_at'], name='diary_created_at_idx'),
            models.Index(fields=['user', 'location_name'], name='diary_user_location_idx'),
        ]

    def __str__(self):
        return f"{self.title} ({self.created_at.strftime('%Y-%m-%d')})"
    
    def get_emotion_display_emoji(self) -> str:
        """감정에 해당하는 이모지 반환"""
        emoji_map = {
            'happy': '😊', 'sad': '😢', 'angry': '😡', 'anxious': '😰',
            'peaceful': '😌', 'excited': '🥳', 'tired': '😴', 'love': '🥰',
        }
        return emoji_map.get(self.emotion, '')

    def encrypt_content(self, plain_content: str) -> None:
        """내용을 암호화하여 저장 (최신 키 버전 사용)"""
        from django.conf import settings
        from ..encryption import get_encryption_service
        service = get_encryption_service()
        if service.is_enabled:
            self.content = service.encrypt(plain_content)
            self.is_encrypted = True
            # 현재 사용된 암호화 키 버전 저장
            self.encryption_version = getattr(settings, 'CURRENT_ENCRYPTION_VERSION', 1)
        else:
            self.content = plain_content
            self.is_encrypted = False

    def decrypt_content(self) -> str:
        """암호화된 내용을 복호화하여 반환"""
        if not self.is_encrypted:
            return self.content
        from ..encryption import get_encryption_service
        service = get_encryption_service()
        # 저장된 키 버전을 사용하여 복호화
        return service.decrypt(self.content, version=self.encryption_version)


class DiaryImage(models.Model):
    """AI 생성 이미지"""
    diary = models.ForeignKey(Diary, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    ai_prompt = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.diary.id}"
