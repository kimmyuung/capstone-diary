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
