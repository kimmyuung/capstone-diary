# diary/models/audit_log.py
from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    """
    보안 감사 로그 모델
    - 누가(user), 언제(created_at), 무엇을(action), 어디서(ip_address) 했는지 기록
    - 민감한 데이터 접근 이력 추적 용도
    """
    ACTION_CHOICES = [
        ('READ', '조회'),
        ('CREATE', '생성'),
        ('UPDATE', '수정'),
        ('DELETE', '삭제'),
        ('LOGIN', '로그인'),
        ('LOGOUT', '로그아웃'),
        ('FAILED_LOGIN', '로그인 실패'),
        ('ACCESS_DENIED', '접근 거부'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource = models.CharField(max_length=100, help_text="접근한 리소스 (예: Diary:123)")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, default='SUCCESS') # SUCCESS, FAILURE
    details = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        username = self.user.username if self.user else 'Anonymous'
        return f"[{self.created_at}] {username} - {self.action} {self.resource}"
