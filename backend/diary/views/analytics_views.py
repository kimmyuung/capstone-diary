# diary/views/analytics_views.py
"""
감정 분석 뷰 (diary_views.py에서 분리)
- 감정 트렌드 분석
- 히트맵 데이터
"""
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import IsAuthenticated

from ..services.analysis_service import EmotionTrendAnalyzer

logger = logging.getLogger(__name__)


class AnalyticsViewSet(GenericViewSet):
    """
    감정 분석 및 통계 ViewSet
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='emotion-trend')
    def emotion_trend(self, request):
        """
        감정 트렌드 분석 결과를 반환합니다.
        - 연속 부정적 감정 감지
        - 격려 메시지 생성
        - 주간 요약
        """
        try:
            days = int(request.query_params.get('days', 7))
        except ValueError:
            days = 7

        try:
            trend_result = EmotionTrendAnalyzer.analyze_recent_trend(request.user, days)
            weekly_summary = EmotionTrendAnalyzer.get_weekly_summary(request.user)
            
            return Response({
                'trend': trend_result,
                'weekly_summary': weekly_summary,
            })
        except Exception as e:
            logger.error(f"Emotion trend analysis failed: {e}")
            return Response(
                {"error": "Failed to analyze emotion trend"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
