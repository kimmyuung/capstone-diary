# diary/views/admin_views.py
"""
관리자 전용 API 뷰
- 통계 대시보드
- 사용자 관리
- 시스템 현황
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta

from ..models import Diary, DiaryImage, Tag

User = get_user_model()


class AdminStatsView(APIView):
    """
    관리자 통계 API
    
    GET /api/admin/stats/
    
    Response:
        {
            "users": {"total": 100, "active": 85, "new_this_week": 5},
            "diaries": {"total": 1500, "this_week": 120, "avg_per_user": 15},
            "ai_images": {"total": 200},
            "emotions": {"most_common": "happy", "distribution": {...}},
            "system": {"timestamp": "2024-12-23T21:00:00Z"}
        }
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # 사용자 통계
        total_users = User.objects.count()
        active_users = User.objects.filter(last_login__gte=week_ago).count()
        new_users = User.objects.filter(date_joined__gte=week_ago).count()
        
        # 일기 통계
        total_diaries = Diary.objects.count()
        diaries_this_week = Diary.objects.filter(created_at__gte=week_ago).count()
        avg_per_user = round(total_diaries / total_users, 1) if total_users > 0 else 0
        
        # AI 이미지 통계
        total_images = DiaryImage.objects.count()
        
        # 감정 분포
        emotion_dist = Diary.objects.filter(
            emotion__isnull=False
        ).values('emotion').annotate(
            count=Count('emotion')
        ).order_by('-count')
        
        most_common = emotion_dist[0]['emotion'] if emotion_dist else None
        
        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'new_this_week': new_users,
            },
            'diaries': {
                'total': total_diaries,
                'this_week': diaries_this_week,
                'avg_per_user': avg_per_user,
            },
            'ai_images': {
                'total': total_images,
            },
            'emotions': {
                'most_common': most_common,
                'distribution': {e['emotion']: e['count'] for e in emotion_dist},
            },
            'system': {
                'timestamp': now.isoformat(),
            }
        })


class AdminUsersView(APIView):
    """
    관리자 사용자 목록 API
    
    GET /api/admin/users/
    
    Query Parameters:
        - page: 페이지 번호 (기본값: 1)
        - limit: 페이지당 항목 수 (기본값: 20)
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        offset = (page - 1) * limit
        
        users = User.objects.annotate(
            diary_count=Count('diary_entries')
        ).order_by('-date_joined')[offset:offset + limit]
        
        total = User.objects.count()
        
        result = []
        for user in users:
            result.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'diary_count': user.diary_count,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            })
        
        return Response({
            'total': total,
            'page': page,
            'limit': limit,
            'users': result,
        })


class AdminRecentDiariesView(APIView):
    """
    관리자 최근 일기 목록 API (내용 없이 메타데이터만)
    
    GET /api/admin/diaries/recent/
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        limit = int(request.query_params.get('limit', 50))
        
        diaries = Diary.objects.select_related('user').order_by('-created_at')[:limit]
        
        result = []
        for diary in diaries:
            result.append({
                'id': diary.id,
                'title': diary.title,
                'user_id': diary.user.id,
                'username': diary.user.username,
                'emotion': diary.emotion,
                'emotion_emoji': diary.get_emotion_display_emoji() if diary.emotion else None,
                'has_images': diary.images.exists(),
                'has_location': bool(diary.latitude and diary.longitude),
                'created_at': diary.created_at.isoformat(),
            })
        
        return Response({
            'count': len(result),
            'diaries': result,
        })
