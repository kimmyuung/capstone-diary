# diary/models/preference.py
"""
사용자 설정 모델
"""
from django.db import models
from django.contrib.auth.models import User


class UserPreference(models.Model):
    """
    사용자 설정 모델
    - 테마 (다크/라이트 모드)
    - 알림 설정
    - 기타 사용자 개인화 설정
    """
    
    THEME_CHOICES = [
        ('light', '라이트 모드'),
        ('dark', '다크 모드'),
        ('system', '시스템 설정'),
    ]
    
    LANGUAGE_CHOICES = [
        ('ko', '한국어'),
        ('en', 'English'),
        ('ja', '日本語'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='preference',
        verbose_name='사용자'
    )
    
    # 테마 설정
    theme = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='system',
        verbose_name='테마'
    )
    
    # 언어 설정
    language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='ko',
        verbose_name='언어'
    )
    
    # 알림 설정
    push_enabled = models.BooleanField(default=True, verbose_name='푸시 알림 허용')
    daily_reminder_enabled = models.BooleanField(default=False, verbose_name='일기 작성 알림')
    daily_reminder_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name='일기 알림 시간'
    )
    
    # AI 기능 설정
    auto_emotion_analysis = models.BooleanField(
        default=True,
        verbose_name='자동 감정 분석'
    )
    
    # 개인정보 설정
    show_location = models.BooleanField(default=True, verbose_name='위치 정보 표시')
    
    # 멤버십 설정 (Feature: User Tiers)
    is_premium = models.BooleanField(default=False, verbose_name='프리미엄 멤버십 여부')
    
    # 스트릭 설정 (Feature: Streak Tracking)
    current_streak = models.IntegerField(default=0, verbose_name='현재 연속 작성')
    max_streak = models.IntegerField(default=0, verbose_name='최고 연속 작성')
    last_diary_date = models.DateField(null=True, blank=True, verbose_name='마지막 일기 작성일')
    
    # 감정 트렌드 알림 설정
    emotion_trend_alert = models.BooleanField(default=True, verbose_name='감정 트렌드 알림')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '사용자 설정'
        verbose_name_plural = '사용자 설정들'
    
    def __str__(self):
        return f"{self.user.username}의 설정"
    
    @classmethod
    def get_or_create_for_user(cls, user):
        """사용자의 설정을 가져오거나 기본값으로 생성"""
        preference, created = cls.objects.get_or_create(user=user)
        return preference
