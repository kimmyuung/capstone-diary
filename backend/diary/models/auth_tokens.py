# diary/models/auth_tokens.py
"""
인증 관련 토큰 모델
- PasswordResetToken: 비밀번호 재설정
- EmailVerificationToken: 이메일 인증
"""
from django.db import models
from django.contrib.auth.models import User


class BaseToken(models.Model):
    """토큰 공통 기능 (추상 클래스)"""
    token = models.CharField(max_length=6, verbose_name='인증 코드')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(verbose_name='만료 시간')
    
    class Meta:
        abstract = True
        ordering = ['-created_at']
    
    @property
    def is_expired(self):
        """토큰 만료 여부"""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @classmethod
    def _generate_code(cls):
        """6자리 랜덤 코드 생성"""
        import random
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])


class PasswordResetToken(BaseToken):
    """
    비밀번호 재설정 토큰
    - 6자리 인증 코드
    - 30분 후 만료
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    is_used = models.BooleanField(default=False, verbose_name='사용 여부')

    class Meta:
        verbose_name = '비밀번호 재설정 토큰'
        verbose_name_plural = '비밀번호 재설정 토큰들'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.token}"

    @property
    def is_valid(self):
        """토큰 유효성"""
        return not self.is_expired and not self.is_used

    @classmethod
    def generate_token(cls, user):
        """새 토큰 생성 (기존 토큰 무효화)"""
        from django.utils import timezone
        from datetime import timedelta

        # 기존 미사용 토큰 무효화
        cls.objects.filter(user=user, is_used=False).update(is_used=True)

        return cls.objects.create(
            user=user,
            token=cls._generate_code(),
            expires_at=timezone.now() + timedelta(minutes=30)
        )


class EmailVerificationToken(BaseToken):
    """
    이메일 인증 토큰
    - 6자리 인증 코드
    - 10분 후 만료
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    is_verified = models.BooleanField(default=False, verbose_name='인증 완료')

    class Meta:
        verbose_name = '이메일 인증 토큰'
        verbose_name_plural = '이메일 인증 토큰들'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.token}"

    @property
    def is_valid(self):
        """토큰 유효성"""
        return not self.is_expired and not self.is_verified

    @classmethod
    def generate_token(cls, user):
        """새 토큰 생성"""
        from django.utils import timezone
        from datetime import timedelta

        # 기존 미인증 토큰 삭제
        cls.objects.filter(user=user, is_verified=False).delete()

        return cls.objects.create(
            user=user,
            token=cls._generate_code(),
            expires_at=timezone.now() + timedelta(minutes=10)
        )
