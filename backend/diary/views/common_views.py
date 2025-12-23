# diary/views/common_views.py
"""
공통/유틸리티 API 뷰
- 연결 테스트
"""
from rest_framework.response import Response
from rest_framework.views import APIView

from ..messages import SUCCESS_API_CONNECTED


class TestConnectionView(APIView):
    """
    React Native 앱의 연결을 테스트하기 위한 API 뷰입니다.
    """
    def get(self, request):
        return Response({
            "status": "success",
            "message": str(SUCCESS_API_CONNECTED),
        })

