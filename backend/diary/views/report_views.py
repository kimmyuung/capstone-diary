# diary/views/report_views.py
"""
감정 리포트 및 캘린더 뷰 (diary_views.py에서 분리)
- 주간/월간/연간 리포트
- 캘린더 데이터
"""
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

from ..models import Diary
from ..messages import ERROR_INVALID_YEAR, ERROR_INVALID_YEAR_MONTH

logger = logging.getLogger(__name__)


class ReportViewSet(GenericViewSet):
    """
    감정 리포트 관련 ViewSet
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='weekly')
    def weekly_report(self, request):
        """
        주간/월간 감정 분석 리포트를 반환합니다.
        (캐싱 적용됨)
        """
        period = request.query_params.get('period', 'week')
        
        # 캐시 키 생성 및 조회
        cache_key = f"report:{request.user.id}:{period}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        try:
            from ..services.report_service import ReportService
            result = ReportService.get_period_report(request.user, period)
            
            # 캐시 저장 (1시간)
            cache_ttl = getattr(settings, 'CACHE_TTL', {}).get('report', 3600)
            cache.set(cache_key, result, cache_ttl)
            
            return Response(result)
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        """
        캘린더 뷰를 위한 월별 일기 요약을 반환합니다.
        """
        now = timezone.now()
        year = request.query_params.get('year', now.year)
        month = request.query_params.get('month', now.month)
        
        try:
            year = int(year)
            month = int(month)
        except ValueError:
            return Response(
                {"error": str(ERROR_INVALID_YEAR_MONTH)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 캐시 키 생성 및 조회
        cache_key = f"calendar:{request.user.id}:{year}:{month}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
            
        try:
            from ..services.report_service import ReportService
            result = ReportService.get_calendar_data(request.user, year, month)
            
            # 캐시 저장 (30분)
            cache_ttl = getattr(settings, 'CACHE_TTL', {}).get('calendar', 1800)
            cache.set(cache_key, result, cache_ttl)
            
            return Response(result)
        except Exception as e:
            logger.error(f"Calendar generation failed: {e}")
            return Response({"error": "Failed to generate calendar"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='annual')
    def annual_report(self, request):
        """
        연간 감정 리포트를 반환합니다.
        """
        now = timezone.now()
        year = request.query_params.get('year', now.year)
        
        try:
            year = int(year)
        except ValueError:
            return Response(
                {"error": str(ERROR_INVALID_YEAR)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            from ..services.report_service import ReportService
            result = ReportService.get_annual_report(request.user, year)
            return Response(result)
        except Exception as e:
            logger.error(f"Annual report generation failed: {e}")
            return Response({"error": "Failed to generate annual report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='heatmap')
    def heatmap(self, request):
        """
        GitHub 잔디 스타일의 감정 히트맵 데이터를 반환합니다.
        """
        from ..models import Diary
        from collections import defaultdict
        
        now = timezone.now()
        year = request.query_params.get('year', now.year)
        
        try:
            year = int(year)
        except ValueError:
            return Response(
                {"error": str(ERROR_INVALID_YEAR)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 캐시 키 생성 및 조회
        cache_key = f"heatmap:{request.user.id}:{year}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # 감정별 색상 매핑
        emotion_colors = {
            'happy': '#FFD93D',      # 노란색
            'sad': '#6B7FD7',        # 파란색
            'angry': '#FF6B6B',      # 빨간색
            'anxious': '#9B59B6',    # 보라색
            'peaceful': '#4ECDC4',   # 초록색
            'excited': '#FF9F43',    # 주황색
            'tired': '#95A5A6',      # 회색
            'love': '#FF6B9D',       # 핑크색
            None: '#E8E8E8',         # 기본 (감정 없음)
        }
        
        # 해당 연도의 일기 조회
        diaries = Diary.objects.filter(
            user=request.user,
            created_at__year=year
        ).order_by('created_at')
        
        # 날짜별 데이터 집계
        date_data = defaultdict(lambda: {'count': 0, 'emotions': []})
        
        for diary in diaries:
            date_str = diary.created_at.strftime('%Y-%m-%d')
            date_data[date_str]['count'] += 1
            if diary.emotion:
                date_data[date_str]['emotions'].append(diary.emotion)
        
        # 시각화 데이터 생성
        result_data = {}
        for date_str, info in date_data.items():
            # 가장 많이 등장한 감정 찾기
            emotions = info['emotions']
            dominant_emotion = None
            if emotions:
                dominant_emotion = max(set(emotions), key=emotions.count)
            
            result_data[date_str] = {
                'count': info['count'],
                'emotion': dominant_emotion,
                'color': emotion_colors.get(dominant_emotion, emotion_colors[None])
            }

        response_data = {
            "year": year,
            "total_entries": diaries.count(),
            "data": result_data
        }
        
        # 캐시 저장 (1시간)
        cache.set(cache_key, response_data, 3600)
        
        return Response(response_data)

