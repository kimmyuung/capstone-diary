"""
콘텐츠 모더레이션 모델
- 유해 콘텐츠 자동 감지 기록
- 사용자 신고 기록
"""
from django.db import models
from django.contrib.auth import get_user_model
from .diary import Diary

User = get_user_model()


class FlaggedContent(models.Model):
    """
    유해 콘텐츠 자동 감지 기록
    AI가 자동으로 감지한 유해 콘텐츠를 기록
    """
    FLAG_TYPES = [
        ('violence', '폭력'),
        ('hate_speech', '혐오 발언'),
        ('self_harm', '자해'),
        ('illegal', '불법 활동'),
        ('harassment', '괴롭힘'),
        ('sexual', '성적 콘텐츠'),
    ]
    
    ACTION_TYPES = [
        ('none', '조치 없음'),
        ('warning', '경고'),
        ('hidden', '숨김'),
        ('deleted', '삭제'),
    ]
    
    diary = models.ForeignKey(
        Diary,
        on_delete=models.CASCADE,
        related_name='flags',
        verbose_name='일기'
    )
    flag_type = models.CharField(
        max_length=50,
        choices=FLAG_TYPES,
        verbose_name='감지 유형'
    )
    confidence = models.FloatField(
        verbose_name='신뢰도',
        help_text='AI 감지 신뢰도 (0.0 ~ 1.0)'
    )
    detected_keywords = models.JSONField(
        default=list,
        blank=True,
        verbose_name='감지된 키워드'
    )
    detected_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='감지 시각'
    )
    reviewed = models.BooleanField(
        default=False,
        verbose_name='검토 완료'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_flags',
        verbose_name='검토자'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='검토 시각'
    )
    action_taken = models.CharField(
        max_length=20,
        choices=ACTION_TYPES,
        default='none',
        verbose_name='조치 내용'
    )
    admin_notes = models.TextField(
        blank=True,
        verbose_name='관리자 메모'
    )
    
    class Meta:
        db_table = 'flagged_content'
        verbose_name = '유해 콘텐츠 감지'
        verbose_name_plural = '유해 콘텐츠 감지 목록'
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['-detected_at']),
            models.Index(fields=['reviewed', '-detected_at']),
            models.Index(fields=['flag_type']),
        ]
    
    def __str__(self):
        return f"[{self.get_flag_type_display()}] {self.diary.title} (신뢰도: {self.confidence:.2f})"


class ContentReport(models.Model):
    """
    사용자 신고 기록
    다른 사용자가 신고한 콘텐츠를 기록
    """
    REPORT_REASONS = [
        ('spam', '스팸'),
        ('inappropriate', '부적절한 콘텐츠'),
        ('violence', '폭력적 콘텐츠'),
        ('hate_speech', '혐오 발언'),
        ('harassment', '괴롭힘'),
        ('false_info', '허위 정보'),
        ('other', '기타'),
    ]
    
    STATUS_CHOICES = [
        ('pending', '대기 중'),
        ('reviewing', '검토 중'),
        ('resolved', '해결됨'),
        ('dismissed', '기각됨'),
    ]
    
    diary = models.ForeignKey(
        Diary,
        on_delete=models.CASCADE,
        related_name='reports',
        verbose_name='일기'
    )
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='content_reports',
        verbose_name='신고자'
    )
    reason = models.CharField(
        max_length=100,
        choices=REPORT_REASONS,
        verbose_name='신고 사유'
    )
    description = models.TextField(
        blank=True,
        verbose_name='상세 설명'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='신고 시각'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='처리 상태'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_reports',
        verbose_name='검토자'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='검토 시각'
    )
    resolution_notes = models.TextField(
        blank=True,
        verbose_name='처리 내용'
    )
    
    class Meta:
        db_table = 'content_report'
        verbose_name = '콘텐츠 신고'
        verbose_name_plural = '콘텐츠 신고 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['diary']),
        ]
        # 같은 사용자가 같은 일기를 중복 신고하지 못하도록
        unique_together = [['diary', 'reporter']]
    
    def __str__(self):
        return f"[{self.get_reason_display()}] {self.diary.title} by {self.reporter.username}"
