# backend/diary/views.py
from rest_framework.response import Response
from rest_framework.views import APIView

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