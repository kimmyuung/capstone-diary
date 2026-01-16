from django.db import models
from django.conf import settings
from . import Diary

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

class DiaryEmbedding(models.Model):
    """
    일기 벡터 임베딩 모델
    RAG(Retrieval Augmented Generation)를 위해 일기 내용을 벡터화하여 저장
    """
    diary = models.OneToOneField(Diary, on_delete=models.CASCADE, related_name='embedding')
    # sentence-transformers/all-MiniLM-L6-v2 uses 384 dimensions
    # OpenAI text-embedding-3-small uses 1536 dimensions
    # We will use local model (384) for free implementation
    vector = VectorField(dimensions=384)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = []
        if HnswIndex:
            indexes.append(
                HnswIndex(
                    name='diary_vector_idx',
                    fields=['vector'],
                    m=16,
                    ef_construction=64,
                    opclasses=['vector_l2_ops']
                )
            )

    def __str__(self):
        return f"Embedding for Diary {self.diary_id}"


class ChatSession(models.Model):
    """
    AI 채팅 세션 모델
    사용자와 AI 간의 대화 세션을 관리
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='chat_sessions'
    )
    title = models.CharField(max_length=100, default="새 대화")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = '채팅 세션'
        verbose_name_plural = '채팅 세션들'
    
    def __str__(self):
        return f"Chat {self.id}: {self.title[:30]} ({self.user.username})"
    
    def get_last_messages(self, count=10):
        """최근 메시지 N개 조회"""
        return self.messages.order_by('-created_at')[:count][::-1]


class ChatMessage(models.Model):
    """
    AI 채팅 메시지 모델
    세션 내 개별 메시지 저장
    """
    ROLE_CHOICES = [
        ('user', '사용자'),
        ('assistant', 'AI'),
        ('system', '시스템'),
    ]
    
    session = models.ForeignKey(
        ChatSession, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # 메타데이터 (선택)
    referenced_diaries = models.ManyToManyField(
        Diary, 
        blank=True, 
        related_name='chat_references'
    )
    token_count = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = '채팅 메시지'
        verbose_name_plural = '채팅 메시지들'
    
    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"[{self.role}] {preview}"

