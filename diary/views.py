# backend/diary/views.py
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .ai_service import ImageGenerator
from .models import DiaryImage


class TestConnectionView(APIView):
    """
    React Native 앱의 연결을 테스트하기 위한 API 뷰입니다.
    """
    def get(self, request):
        return Response({
            "status": "success",
            "message": "Django 백엔드 연결 성공! React Native 앱이 API를 잘 호출했습니다.",
            "server_time": "현재 시간: 2025-12-06 (예시)", 
        })
class DiaryViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def generate_image(self, request, pk=None):
        """일기에 대한 이미지 생성"""
        diary = self.get_object()
        
        try:
            # 이미지 생성
            generator = ImageGenerator()
            result = generator.generate(diary.content)
            
            # DB에 저장
            diary_image = DiaryImage.objects.create(
                diary=diary,
                image_url=result['url'],
                ai_prompt=result['prompt']
            )
            
            serializer = DiaryImageSerializer(diary_image)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )