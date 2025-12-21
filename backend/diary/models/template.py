# diary/models/template.py
"""
일기 템플릿 모델
"""
from django.db import models
from django.contrib.auth.models import User


class DiaryTemplate(models.Model):
    """
    일기 템플릿 모델
    - 시스템 기본 템플릿 (user=null)
    - 사용자 커스텀 템플릿
    """
    
    TEMPLATE_TYPE_CHOICES = [
        ('system', '시스템 템플릿'),
        ('user', '사용자 템플릿'),
    ]
    
    CATEGORY_CHOICES = [
        ('daily', '일상'),
        ('gratitude', '감사'),
        ('goal', '목표'),
        ('reflection', '회고'),
        ('emotion', '감정'),
        ('travel', '여행'),
        ('exercise', '운동'),
        ('custom', '커스텀'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='diary_templates',
        verbose_name='사용자',
        help_text='시스템 템플릿은 user=null'
    )
    template_type = models.CharField(
        max_length=10,
        choices=TEMPLATE_TYPE_CHOICES,
        default='user',
        verbose_name='템플릿 유형'
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='daily',
        verbose_name='카테고리'
    )
    
    name = models.CharField(max_length=50, verbose_name='템플릿 이름')
    emoji = models.CharField(max_length=10, default='📝', verbose_name='아이콘')
    description = models.CharField(max_length=200, verbose_name='설명')
    content = models.TextField(verbose_name='템플릿 내용')
    
    is_active = models.BooleanField(default=True, verbose_name='활성화')
    use_count = models.PositiveIntegerField(default=0, verbose_name='사용 횟수')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '일기 템플릿'
        verbose_name_plural = '일기 템플릿들'
        ordering = ['-use_count', 'name']
    
    def __str__(self):
        return f"{self.emoji} {self.name}"
    
    def increment_use_count(self):
        """사용 횟수 증가"""
        self.use_count += 1
        self.save(update_fields=['use_count'])
    
    @classmethod
    def get_system_templates(cls):
        """시스템 템플릿 목록 반환"""
        return cls.objects.filter(template_type='system', is_active=True)
    
    @classmethod
    def get_user_templates(cls, user):
        """사용자 템플릿 목록 반환"""
        return cls.objects.filter(user=user, is_active=True)
    
    @classmethod
    def get_all_for_user(cls, user):
        """사용자가 사용 가능한 모든 템플릿"""
        from django.db.models import Q
        return cls.objects.filter(
            Q(template_type='system') | Q(user=user),
            is_active=True
        ).order_by('-use_count', 'name')
