# diary/views/gallery_views.py
"""
갤러리 뷰 (diary_views.py에서 분리)
- AI 생성 이미지 갤러리
"""
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import IsAuthenticated

from ..models import DiaryImage

logger = logging.getLogger(__name__)


class GalleryViewSet(GenericViewSet):
    """
    AI 생성 이미지 갤러리 ViewSet
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='images')
    def images(self, request):
        """
        사용자의 모든 AI 생성 이미지를 반환합니다.
        """
        images = DiaryImage.objects.filter(
            diary__user=request.user
        ).select_related('diary').order_by('-created_at')
        
        result = []
        for img in images:
            result.append({
                'id': img.id,
                'image_url': img.image_url,
                'ai_prompt': img.ai_prompt,
                'created_at': img.created_at.isoformat(),
                'diary_id': img.diary.id,
                'diary_title': img.diary.title,
                'diary_date': img.diary.created_at.strftime('%Y-%m-%d'),
            })
        
        return Response({
            'total_images': len(result),
            'images': result
        })
