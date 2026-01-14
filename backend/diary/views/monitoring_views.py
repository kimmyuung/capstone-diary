"""
시스템 모니터링 API
- AI 사용량 추적
- 시스템 상태 확인
- 에러 로그 조회
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from ..models import DiaryImage, Diary

User = get_user_model()


class AIUsageStatsView(APIView):
    """
    AI 사용량 통계 API
    
    GET /api/admin/ai-usage/
    
    Query Parameters:
        - days: 조회 기간 (기본값: 30일)
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="AI 사용량 통계 조회",
        description="기간별 AI 이미지 생성 수, 감정 분석 횟수 및 추정 비용을 반환합니다.",
        parameters=[
            OpenApiParameter('days', OpenApiTypes.INT, description='조회 기간 (일 단위, 기본값: 30)'),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # 이미지 생성 통계
        total_images = DiaryImage.objects.filter(created_at__gte=start_date).count()
        
        # 일별 이미지 생성 추이
        daily_images = []
        for i in range(days):
            day = timezone.now() - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            count = DiaryImage.objects.filter(
                created_at__gte=day_start,
                created_at__lt=day_end
            ).count()
            
            daily_images.append({
                'date': day_start.date().isoformat(),
                'count': count
            })
        
        daily_images.reverse()
        
        # 사용자별 이미지 생성 TOP 10
        top_users = User.objects.annotate(
            image_count=Count('diary_entries__images')
        ).filter(
            image_count__gt=0
        ).order_by('-image_count')[:10]
        
        top_users_data = [
            {
                'user_id': user.id,
                'username': user.username,
                'image_count': user.image_count
            }
            for user in top_users
        ]
        
        # 감정 분석 통계 (AI 사용)
        total_emotion_analyses = Diary.objects.filter(
            created_at__gte=start_date,
            emotion__isnull=False
        ).count()
        
        # 비용 추정 (예시)
        # Gemini 이미지 생성: $0.05/image (가정)
        # 감정 분석: $0.001/request (가정)
        estimated_cost = (total_images * 0.05) + (total_emotion_analyses * 0.001)
        
        return Response({
            'period_days': days,
            'images': {
                'total': total_images,
                'daily': daily_images,
                'top_users': top_users_data,
            },
            'emotion_analyses': {
                'total': total_emotion_analyses,
            },
            'estimated_cost': {
                'amount': round(estimated_cost, 2),
                'currency': 'USD',
                'note': '추정치입니다. 실제 비용은 API 제공자의 청구서를 확인하세요.'
            }
        })


class SystemHealthView(APIView):
    """
    시스템 상태 확인 API
    
    GET /api/admin/system/health/
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="시스템 상태 확인",
        description="데이터베이스, Redis, Celery 등 주요 컴포넌트의 연결 상태를 확인합니다.",
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        from django.db import connection
        import redis
        from django.conf import settings
        
        health_status = {
            'overall': 'healthy',
            'components': {}
        }
        
        # 데이터베이스 상태
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_status['components']['database'] = {
                'status': 'healthy',
                'message': 'Database connection OK'
            }
        except Exception as e:
            health_status['components']['database'] = {
                'status': 'unhealthy',
                'message': str(e)
            }
            health_status['overall'] = 'unhealthy'
        
        # Redis 상태 (캐시)
        try:
            redis_client = redis.from_url(settings.CELERY_BROKER_URL)
            redis_client.ping()
            health_status['components']['redis'] = {
                'status': 'healthy',
                'message': 'Redis connection OK'
            }
        except Exception as e:
            health_status['components']['redis'] = {
                'status': 'degraded',
                'message': str(e)
            }
        
        # Celery 상태 (간단한 체크)
        try:
            from celery import current_app
            inspect = current_app.control.inspect()
            stats = inspect.stats()
            
            if stats:
                health_status['components']['celery'] = {
                    'status': 'healthy',
                    'message': f'{len(stats)} worker(s) active',
                    'workers': len(stats)
                }
            else:
                health_status['components']['celery'] = {
                    'status': 'degraded',
                    'message': 'No workers found'
                }
        except Exception as e:
            health_status['components']['celery'] = {
                'status': 'unknown',
                'message': str(e)
            }
        
        health_status['timestamp'] = timezone.now().isoformat()
        
        return Response(health_status)


class SystemMetricsView(APIView):
    """
    시스템 성능 지표 API
    
    GET /api/admin/system/metrics/
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="시스템 성능 지표",
        description="데이터베이스 쿼리 수 등 간단한 성능 지표를 반환합니다.",
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        # 간단한 메트릭 (실제로는 APM 도구 사용 권장)
        from django.db import connection
        
        metrics = {
            'database': {
                'queries_count': len(connection.queries),
                'note': 'DEBUG 모드에서만 사용 가능'
            },
            'timestamp': timezone.now().isoformat()
        }
        
        return Response(metrics)
