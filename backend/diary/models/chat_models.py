from django.db import models
from pgvector.django import VectorField
from . import Diary

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

    def __str__(self):
        return f"Embedding for Diary {self.diary_id}"
