# diary/models/tag.py
"""
태그 관련 모델
- Tag: 사용자별 태그
- DiaryTag: 일기-태그 연결
"""
from django.db import models
from django.contrib.auth.models import User


class Tag(models.Model):
    """
    태그 모델
    - 사용자별 태그 관리
    - 일기 분류 및 검색에 활용
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tags',
        verbose_name='사용자'
    )
    name = models.CharField(max_length=50, verbose_name='태그명')
    color = models.CharField(
        max_length=7,
        default='#6366F1',
        verbose_name='태그 색상',
        help_text='HEX 색상 코드 (예: #6366F1)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '태그'
        verbose_name_plural = '태그들'
        ordering = ['name']
        unique_together = ['user', 'name']
        indexes = [
            models.Index(fields=['user', 'name'], name='tag_user_name_idx'),
        ]
    
    def __str__(self):
        return f"#{self.name}"


class DiaryTag(models.Model):
    """
    일기-태그 연결 모델 (중간 테이블)
    """
    diary = models.ForeignKey(
        'Diary',
        on_delete=models.CASCADE,
        related_name='diary_tags'
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name='diary_tags'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '일기 태그'
        verbose_name_plural = '일기 태그들'
        unique_together = ['diary', 'tag']
    
    def __str__(self):
        return f"{self.diary.title} - #{self.tag.name}"
