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
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

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
    
    @extend_schema(
        summary="관리자 대시보드 통계",
        description="사용자, 일기, AI 이미지 생성 등 전체 시스템 통계를 반환합니다.",
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # 사용자 통계
        total_users = User.objects.count()
        active_users = User.objects.filter(last_login__gte=week_ago).count()
        new_users = User.objects.filter(date_joined__gte=week_ago).count()
        premium_users = User.objects.filter(preferences__is_premium=True).count()
        
        # 일기 통계
        total_diaries = Diary.objects.count()
        diaries_this_week = Diary.objects.filter(created_at__gte=week_ago).count()
        diaries_this_month = Diary.objects.filter(created_at__gte=month_ago).count()
        avg_per_user = round(total_diaries / total_users, 1) if total_users > 0 else 0
        
        # AI 이미지 통계
        total_images = DiaryImage.objects.count()
        images_this_week = DiaryImage.objects.filter(created_at__gte=week_ago).count()
        
        # 감정 분포
        emotion_dist = Diary.objects.filter(
            emotion__isnull=False
        ).values('emotion').annotate(
            count=Count('emotion')
        ).order_by('-count')
        
        most_common = emotion_dist[0]['emotion'] if emotion_dist else None
        
        # 모더레이션 통계
        from ..models import FlaggedContent, ContentReport
        total_flags = FlaggedContent.objects.count()
        pending_flags = FlaggedContent.objects.filter(reviewed=False).count()
        total_reports = ContentReport.objects.count()
        pending_reports = ContentReport.objects.filter(status='pending').count()
        
        # 일별 트렌드 (최근 7일)
        daily_trends = []
        for i in range(7):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            daily_trends.append({
                'date': day_start.date().isoformat(),
                'diaries': Diary.objects.filter(
                    created_at__gte=day_start,
                    created_at__lt=day_end
                ).count(),
                'users': User.objects.filter(
                    date_joined__gte=day_start,
                    date_joined__lt=day_end
                ).count(),
            })
        
        daily_trends.reverse()  # 오래된 날짜부터 정렬
        
        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'new_this_week': new_users,
                'premium': premium_users,
            },
            'diaries': {
                'total': total_diaries,
                'this_week': diaries_this_week,
                'this_month': diaries_this_month,
                'avg_per_user': avg_per_user,
            },
            'ai_images': {
                'total': total_images,
                'this_week': images_this_week,
            },
            'emotions': {
                'most_common': most_common,
                'distribution': {e['emotion']: e['count'] for e in emotion_dist},
            },
            'moderation': {
                'total_flags': total_flags,
                'pending_flags': pending_flags,
                'total_reports': total_reports,
                'pending_reports': pending_reports,
            },
            'trends': {
                'daily': daily_trends,
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
        - search: 검색어 (username, email)
        - is_active: 활성화 상태 필터 (true/false)
        - is_premium: 프리미엄 필터 (true/false)
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="사용자 목록 조회",
        description="전체 사용자 목록을 검색하고 필터링합니다.",
        parameters=[
            OpenApiParameter('page', OpenApiTypes.INT, description='페이지 번호'),
            OpenApiParameter('limit', OpenApiTypes.INT, description='페이지당 항목 수'),
            OpenApiParameter('search', OpenApiTypes.STR, description='검색어 (username, email)'),
            OpenApiParameter('is_active', OpenApiTypes.BOOL, description='활성 상태 필터'),
            OpenApiParameter('is_premium', OpenApiTypes.BOOL, description='프리미엄 상태 필터'),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        offset = (page - 1) * limit
        
        # 기본 쿼리셋
        queryset = User.objects.annotate(
            diary_count=Count('diary_entries')
        )
        
        # 검색 필터
        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )
        
        # 활성화 상태 필터
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # 프리미엄 필터
        is_premium = request.query_params.get('is_premium')
        if is_premium is not None:
            queryset = queryset.filter(
                preferences__is_premium=is_premium.lower() == 'true'
            )
        
        total = queryset.count()
        users = queryset.order_by('-date_joined')[offset:offset + limit]
        
        result = []
        for user in users:
            # 프리미엄 정보 가져오기
            try:
                is_premium_user = user.preferences.is_premium
            except:
                is_premium_user = False
            
            result.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'diary_count': user.diary_count,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_premium': is_premium_user,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            })
        
        return Response({
            'total': total,
            'page': page,
            'limit': limit,
            'users': result,
        })
    
    @extend_schema(
        summary="사용자 정보 수정 (관리자)",
        description="특정 사용자의 활성 상태 또는 프리미엄 상태를 변경합니다.",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    def patch(self, request, user_id):
        """
        사용자 상태 변경
        
        PATCH /api/admin/users/<id>/
        
        Body:
            {
                "is_active": true/false,
                "is_premium": true/false
            }
        """
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': '사용자를 찾을 수 없습니다.'}, status=404)
        
        # 활성화 상태 변경
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
            user.save()
        
        # 프리미엄 상태 변경
        if 'is_premium' in request.data:
            from ..models import UserPreference
            pref, created = UserPreference.objects.get_or_create(user=user)
            pref.is_premium = request.data['is_premium']
            pref.save()
        
        return Response({
            'success': True,
            'message': '사용자 정보가 업데이트되었습니다.'
        })


class AdminRecentDiariesView(APIView):
    """
    관리자 최근 일기 목록 API (내용 없이 메타데이터만)
    
    GET /api/admin/diaries/recent/
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="최근 일기 목록 조회",
        description="최근 작성된 일기의 메타데이터 목록을 반환합니다.",
        parameters=[
            OpenApiParameter('limit', OpenApiTypes.INT, description='항목 수 제한'),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
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


class AdminModerationView(APIView):
    """
    콘텐츠 모더레이션 관리 API
    
    GET /api/admin/moderation/
    
    Query Parameters:
        - type: 'flags' (자동 감지) 또는 'reports' (사용자 신고)
        - status: 'pending', 'reviewed', 'resolved' 등
        - limit: 결과 수 제한
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="모더레이션 목록 조회",
        description="유해 콘텐츠 감지 내역(flags) 또는 사용자 신고 내역(reports)을 조회합니다.",
        parameters=[
            OpenApiParameter('type', OpenApiTypes.STR, description="조회 유형 ('flags' 또는 'reports')"),
            OpenApiParameter('status', OpenApiTypes.STR, description="처리 상태 ('pending', 'reviewed', 'resolved')"),
            OpenApiParameter('limit', OpenApiTypes.INT, description='항목 수 제한'),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        from ..models import FlaggedContent, ContentReport
        
        mod_type = request.query_params.get('type', 'flags')
        status = request.query_params.get('status', 'pending')
        limit = int(request.query_params.get('limit', 50))
        
        if mod_type == 'flags':
            # 자동 감지된 유해 콘텐츠
            queryset = FlaggedContent.objects.select_related('diary', 'diary__user')
            
            if status == 'pending':
                queryset = queryset.filter(reviewed=False)
            elif status == 'reviewed':
                queryset = queryset.filter(reviewed=True)
            
            queryset = queryset.order_by('-detected_at')[:limit]
            
            result = []
            for flag in queryset:
                result.append({
                    'id': flag.id,
                    'type': 'flag',
                    'diary_id': flag.diary.id,
                    'diary_title': flag.diary.title,
                    'user_id': flag.diary.user.id,
                    'username': flag.diary.user.username,
                    'flag_type': flag.flag_type,
                    'flag_type_display': flag.get_flag_type_display(),
                    'confidence': flag.confidence,
                    'keywords': flag.detected_keywords,
                    'detected_at': flag.detected_at.isoformat(),
                    'reviewed': flag.reviewed,
                    'action_taken': flag.action_taken,
                    'admin_notes': flag.admin_notes,
                })
        
        else:  # reports
            # 사용자 신고
            queryset = ContentReport.objects.select_related(
                'diary', 'diary__user', 'reporter'
            )
            
            if status in ['pending', 'reviewing', 'resolved', 'dismissed']:
                queryset = queryset.filter(status=status)
            
            queryset = queryset.order_by('-created_at')[:limit]
            
            result = []
            for report in queryset:
                result.append({
                    'id': report.id,
                    'type': 'report',
                    'diary_id': report.diary.id,
                    'diary_title': report.diary.title,
                    'user_id': report.diary.user.id,
                    'username': report.diary.user.username,
                    'reporter_id': report.reporter.id,
                    'reporter_username': report.reporter.username,
                    'reason': report.reason,
                    'reason_display': report.get_reason_display(),
                    'description': report.description,
                    'created_at': report.created_at.isoformat(),
                    'status': report.status,
                    'status_display': report.get_status_display(),
                    'resolution_notes': report.resolution_notes,
                })
        
        return Response({
            'count': len(result),
            'type': mod_type,
            'items': result,
        })
    
    @extend_schema(
        summary="모더레이션 조치 처리",
        description="감지된 콘텐츠나 신고에 대해 경고, 삭제, 무시 등의 조치를 수행합니다.",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    def patch(self, request, item_id):
        """
        모더레이션 조치 처리
        
        PATCH /api/admin/moderation/<id>/
        
        Body:
            {
                "type": "flag" or "report",
                "action": "none" / "warning" / "hidden" / "deleted",
                "notes": "관리자 메모"
            }
        """
        from ..models import FlaggedContent, ContentReport
        from django.utils import timezone
        
        mod_type = request.data.get('type', 'flag')
        action = request.data.get('action')
        notes = request.data.get('notes', '')
        
        if mod_type == 'flag':
            try:
                flag = FlaggedContent.objects.get(id=item_id)
            except FlaggedContent.DoesNotExist:
                return Response({'error': '항목을 찾을 수 없습니다.'}, status=404)
            
            flag.reviewed = True
            flag.reviewed_by = request.user
            flag.reviewed_at = timezone.now()
            flag.action_taken = action
            flag.admin_notes = notes
            flag.save()
            
            # 실제 일기 처리 (삭제 또는 숨김)
            if action == 'deleted':
                flag.diary.delete()
            elif action == 'hidden':
                # 숨김 처리 로직 (향후 구현)
                pass
        
        else:  # report
            try:
                report = ContentReport.objects.get(id=item_id)
            except ContentReport.DoesNotExist:
                return Response({'error': '항목을 찾을 수 없습니다.'}, status=404)
            
            report.status = 'resolved' if action in ['warning', 'hidden', 'deleted'] else 'dismissed'
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()
            report.resolution_notes = notes
            report.save()
            
            # 실제 일기 처리
            if action == 'deleted':
                report.diary.delete()
            elif action == 'hidden':
                # 숨김 처리 로직 (향후 구현)
                pass
        
        return Response({
            'success': True,
            'message': '모더레이션 조치가 완료되었습니다.'
        })
