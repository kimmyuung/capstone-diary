from django.db import models
from django.conf import settings
from django.contrib.auth.models import User

# Handle VectorField and HnswIndex for SQLite (Testing) vs Postgres (Production)
if 'postgresql' in settings.DATABASES['default']['ENGINE']:
    from pgvector.django import VectorField, HnswIndex
else:
    # Fallback for SQLite to allow tests to run
    class VectorField(models.TextField):
        def __init__(self, *args, **kwargs):
            if 'dimensions' in kwargs:
                del kwargs['dimensions']
            super().__init__(*args, **kwargs)
            
    HnswIndex = None

class DiarySummary(models.Model):
    """
    일기 요약 모델 (계층적 메모리)
    주간/월간 단위로 일기를 요약하여 장기 기억 검색 속도와 품질을 향상시킴
    """
    class PeriodType(models.TextChoices):
        WEEKLY = 'WEEKLY', '주간'
        MONTHLY = 'MONTHLY', '월간'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='diary_summaries')
    period_type = models.CharField(max_length=10, choices=PeriodType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    
    summary_text = models.TextField()
    
    # 요약 내용에 대한 임베딩 벡터 (384차원 - all-MiniLM-L6-v2)
    vector = VectorField(dimensions=384, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['user', 'period_type', '-start_date']),
        ]
        if HnswIndex:
            indexes.append(
                HnswIndex(
                    name='summary_vector_idx',
                    fields=['vector'],
                    m=16,
                    ef_construction=64,
                    opclasses=['vector_l2_ops']
                )
            )
        unique_together = ['user', 'period_type', 'start_date']
        verbose_name = '요약'
        verbose_name_plural = '요약들'

    def __str__(self):
        return f"{self.user.username}'s {self.period_type} Summary ({self.start_date})"
