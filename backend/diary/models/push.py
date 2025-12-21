# diary/models/push.py
"""
푸시 알림 관련 모델
"""
from django.db import models
from django.contrib.auth.models import User


class PushToken(models.Model):
    """
    푸시 알림 토큰 모델
    - 사용자별 Expo Push Token 저장
    - 기기별 토큰 관리
    """
    
    DEVICE_TYPES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('web', 'Web'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_tokens')
    token = models.CharField(max_length=200, unique=True, verbose_name='Expo Push Token')
    device_type = models.CharField(
        max_length=20,
        choices=DEVICE_TYPES,
        default='android',
        verbose_name='기기 유형'
    )
    device_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='기기명')
    is_active = models.BooleanField(default=True, verbose_name='활성 상태')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '푸시 토큰'
        verbose_name_plural = '푸시 토큰들'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active'], name='push_user_active_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.device_type} ({self.token[:20]}...)"
