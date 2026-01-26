# diary/views/diary_views.py
"""
일기(Diary) 관련 API 뷰
- 일기 CRUD
- 감정 리포트
- 캘린더
- 갤러리
- 내보내기 (JSON/PDF)
- 위치 기반 일기
- AI 이미지 생성
"""
import logging
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Avg
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from datetime import timedelta, datetime

from ..models import Diary, DiaryEmbedding, DiaryImage
from ..serializers import DiarySerializer, DiaryImageSerializer
from ..services.image_service import ImageGenerator
from ..services.summary_service import SummaryService
from ..services.analysis_service import KeywordExtractor

from ..paginations import StandardResultsSetPagination
from ..messages import ERROR_INVALID_YEAR, ERROR_INVALID_YEAR_MONTH
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from ..schema_examples import (
    EXAMPLE_400_BAD_REQUEST, EXAMPLE_401_UNAUTHORIZED,
    EXAMPLE_403_FORBIDDEN, EXAMPLE_404_NOT_FOUND,
    EXAMPLE_409_CONFLICT, EXAMPLE_429_THROTTLED,
    EXAMPLE_500_SERVER_ERROR
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(
        summary="일기 목록 조회",
        description="사용자의 일기 목록을 조회합니다. 검색, 필터링, 페이징을 지원합니다.",
        responses={
            200: DiarySerializer,
            400: OpenApiResponse(description="잘못된 파라미터", examples=[EXAMPLE_400_BAD_REQUEST]),
            401: OpenApiResponse(description="인증 실패", examples=[EXAMPLE_401_UNAUTHORIZED]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
            500: OpenApiResponse(description="서버 오류", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    ),
    create=extend_schema(
        summary="일기 작성",
        description="새로운 일기를 작성합니다. 감정 분석과 태그 생성이 자동으로 수행됩니다.",
        responses={
            201: DiarySerializer,
            400: OpenApiResponse(description="유효성 검사 실패", examples=[EXAMPLE_400_BAD_REQUEST]),
            401: OpenApiResponse(description="인증 실패", examples=[EXAMPLE_401_UNAUTHORIZED]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
            500: OpenApiResponse(description="서버 오류", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    ),
    retrieve=extend_schema(
        summary="일기 상세 조회",
        description="일기 상세 내용을 조회합니다. 암호화된 내용은 자동으로 복호화됩니다.",
        responses={
            200: DiarySerializer,
            401: OpenApiResponse(description="인증 실패", examples=[EXAMPLE_401_UNAUTHORIZED]),
            403: OpenApiResponse(description="권한 없음", examples=[EXAMPLE_403_FORBIDDEN]),
            404: OpenApiResponse(description="찾을 수 없음", examples=[EXAMPLE_404_NOT_FOUND]),
             500: OpenApiResponse(description="서버 오류", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    ),
    update=extend_schema(
        summary="일기 수정",
        description="일기 내용을 수정합니다. 버전 충돌 시 409 에러를 반환합니다.",
        responses={
            200: DiarySerializer,
            400: OpenApiResponse(description="유효성 검사 실패", examples=[EXAMPLE_400_BAD_REQUEST]),
            401: OpenApiResponse(description="인증 실패", examples=[EXAMPLE_401_UNAUTHORIZED]),
            403: OpenApiResponse(description="권한 없음", examples=[EXAMPLE_403_FORBIDDEN]),
            404: OpenApiResponse(description="찾을 수 없음", examples=[EXAMPLE_404_NOT_FOUND]),
            409: OpenApiResponse(description="버전 충돌", examples=[EXAMPLE_409_CONFLICT]),
            500: OpenApiResponse(description="서버 오류", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    ),
    destroy=extend_schema(
        summary="일기 삭제",
        description="일기를 삭제합니다.",
        responses={
            204: None,
            401: OpenApiResponse(description="인증 실패", examples=[EXAMPLE_401_UNAUTHORIZED]),
            403: OpenApiResponse(description="권한 없음", examples=[EXAMPLE_403_FORBIDDEN]),
            404: OpenApiResponse(description="찾을 수 없음", examples=[EXAMPLE_404_NOT_FOUND]),
            500: OpenApiResponse(description="서버 오류", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    ),
)
class DiaryViewSet(viewsets.ModelViewSet):
    """
    일기(Diary) 항목에 대한 CRUD 및 AI 기능을 제공하는 ViewSet.
    
    검색 파라미터:
        - search: 제목 또는 내용 검색 (키워드)
        - emotion: 감정 필터 (happy, sad, angry 등)
        - start_date: 시작 날짜 (YYYY-MM-DD)
        - end_date: 종료 날짜 (YYYY-MM-DD)
    """
    serializer_class = DiarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        요청한 사용자에 속한 일기 항목만 반환합니다.
        검색/필터 기능 포함.
        
        검색 파라미터:
            - search: 제목 검색 (DB 레벨)
            - content_search: 본문 검색 (DiaryTag 기반 DB 검색)
            - emotion: 감정 필터
            - start_date, end_date: 날짜 범위
        """
        queryset = Diary.objects.filter(user=self.request.user)
        
        # 키워드 검색 (제목) - DB 레벨
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
            )
        
        # 감정 필터
        emotion = self.request.query_params.get('emotion', None)
        if emotion:
            queryset = queryset.filter(emotion=emotion)
        
        # 날짜 범위 필터
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                queryset = queryset.filter(created_at__date__gte=start.date())
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                queryset = queryset.filter(created_at__date__lte=end.date())
            except ValueError:
                pass
        
        # 태그 필터
        tag = self.request.query_params.get('tag', None)
        if tag:
            queryset = queryset.filter(diary_tags__tag__name__icontains=tag).distinct()
        
        return queryset.order_by('-created_at').select_related('user').prefetch_related('images', 'diary_tags__tag')
    
    def list(self, request, *args, **kwargs):
        """
        일기 목록 조회 - 본문 검색 포함
        
        본문 검색은 암호화되어 있어 DB에서 직접 검색 불가.
        queryset을 가져온 후 Python에서 복호화하여 필터링.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # [Optimized] 본문 검색 (태그 기반 or 키워드 필드)
        content_search = request.query_params.get('content_search', None)
        exact_match = request.query_params.get('exact_match', 'false').lower() == 'true'
        
        if content_search:
            if exact_match:
                # [Feature: Option A] Exact Match using search_keywords field
                # 단순 포함 검색이지만, 명사 키워드 필드를 대상으로 하여 정확도 높임
                queryset = queryset.filter(search_keywords__icontains=content_search)
            else:
                # [Legacy/Hybrid] 태그 이름에 검색어가 포함된 일기 검색
                queryset = queryset.filter(diary_tags__tag__name__icontains=content_search).distinct()
        
        # [Optimized] 통합 검색 (제목 + 본문)
        q = request.query_params.get('q', None)
        if q:
            from django.db.models import Q
            if exact_match:
                 queryset = queryset.filter(
                    Q(title__icontains=q) | 
                    Q(search_keywords__icontains=q)
                ).distinct()
            else:
                queryset = queryset.filter(
                    Q(title__icontains=q) | 
                    Q(diary_tags__tag__name__icontains=q)
                ).distinct()
            
        # 정렬 및 최적화
        queryset = queryset.order_by('-created_at').select_related('user').prefetch_related('images', 'diary_tags__tag')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """일기 상세 조회 (키워드 추출 포함)"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # [Optimized] 키워드 조회 (DB 태그 활용)
        # 기존: 실시간 AI 모델 로딩 (매우 느림) -> 변경: 저장된 태그 조회 (O(1))
        # KeywordExtractor 초기화 제거
        tags = instance.diary_tags.all().select_related('tag')
        keywords = [dt.tag.name for dt in tags]
        data['keywords'] = keywords
            
        return Response(data)

    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        """유사한 일기 추천 (Vector Search)"""
        diary = self.get_object()
        
        # 1. 현재 일기의 임베딩 조회
        try:
            embedding_obj = DiaryEmbedding.objects.get(diary=diary)
        except DiaryEmbedding.DoesNotExist:
            return Response({"message": "No embedding found for this diary"}, status=status.HTTP_404_NOT_FOUND)
            
        # 2. pgvector 거리 기반 검색 (L2 distance <->)
        # 자기 자신 제외, 상위 3개
        similar_embeddings = DiaryEmbedding.objects.filter(
            diary__user=request.user
        ).exclude(
            diary=diary
        ).order_by(
            embedding_obj.vector.l2_distance('vector')
        )[:3]
        
        similar_diaries = []
        for emb in similar_embeddings:
            d = emb.diary
            similar_diaries.append({
                'id': d.id,
                'title': d.title,
                'date': d.created_at.strftime("%Y-%m-%d"),
                'emotion': d.emotion,
                'preview': d.content[:50]
            })
            
        return Response(similar_diaries)

    def perform_create(self, serializer):
        """
        새로운 일기 항목을 생성할 때 현재 사용자를 자동으로 할당합니다.
        생성 후 관련 캐시를 무효화합니다.
        
        [하루 1개 제한] 오늘 날짜에 이미 일기가 있으면 생성을 차단합니다.
        """
        from ..cache_utils import invalidate_user_cache
        from datetime import date
        
        # 오늘 날짜에 이미 일기가 있는지 확인
        today = date.today()
        existing_diary = Diary.objects.filter(
            user=self.request.user,
            created_at__date=today
        ).first()
        
        if existing_diary:
            # 기존 일기가 있으면 409 Conflict 응답
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'error': 'DIARY_EXISTS_TODAY',
                'message': '오늘 일기가 이미 작성되었습니다.',
                'existing_diary_id': existing_diary.id
            })
        
        serializer.save(user=self.request.user)
        instance = serializer.instance
        self._generate_reflection_if_needed(instance)
        invalidate_user_cache(self.request.user.id)
        
        # 스트릭 업데이트
        from .preference_views import update_user_streak
        update_user_streak(self.request.user)
    
    @extend_schema(
        summary="일기 수정",
        description="일기 내용을 수정합니다. 버전 충돌 시 서버의 최신 데이터를 포함하여 409 에러를 반환합니다. ?force=true로 강제 수정 가능합니다.",
        responses={
            200: DiarySerializer,
            409: OpenApiResponse(description="버전 충돌 (최신 데이터 포함)"),
        }
    )
    def update(self, request, *args, **kwargs):
        """
        일기 수정 (Optimistic Locking 적용)
        - version 불일치 시 409 Conflict 반환 (최신 데이터 포함)
        - ?force=true 파라미터로 강제 덮어쓰기 가능
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 1. Force Update 체크
        force_update = request.query_params.get('force', 'false').lower() == 'true'
        
        # 2. 버전 검증
        request_version = request.data.get('version')
        
        if not force_update and request_version is not None:
            if int(request_version) != instance.version:
                # 충돌 발생: 서버의 최신 데이터를 포함하여 응답 (Frontend 병합 지원)
                latest_serializer = self.get_serializer(instance)
                return Response(
                    {
                        "detail": "Data has been modified by another process.",
                        "code": "conflict",
                        "server_version": instance.version,
                        "client_version": int(request_version),
                        "latest_data": latest_serializer.data
                    },
                    status=status.HTTP_409_CONFLICT
                )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def perform_update(self, serializer):
        """
        일기 수정 시 관련 캐시를 무효화하고 버전을 증가시킵니다.
        """
        from ..cache_utils import invalidate_user_cache
        from django.db.models import F
        
        # Atomic Version Increment
        instance = serializer.instance
        instance.version = F('version') + 1
        serializer.save()
        
        # 갱신된 값 다시 로드 (F 객체 표현식 결과를 값으로 변환)
        instance.refresh_from_db()
        
        self._generate_reflection_if_needed(instance)
        invalidate_user_cache(self.request.user.id)
    
    def _generate_reflection_if_needed(self, instance):
        """회고 질문이 없고 내용이 충분하면 비동기(혹은 동기)로 생성"""
        # 이미 질문이 있거나 내용이 너무 짧으면 생성 안 함
        if instance.reflection_question or len(instance.content) < 10:
            return
            
        try:
            from ..services.chat_service import ChatService
            question = ChatService.generate_reflection_question(instance)
            if question:
                instance.reflection_question = question
                instance.save(update_fields=['reflection_question'])
        except Exception as e:
            logger.error(f"Failed to generate reflection question: {e}")
    
    def perform_destroy(self, instance):
        """
        일기 삭제 시 관련 캐시를 무효화합니다.
        """
        from ..cache_utils import invalidate_user_cache
        
        user_id = instance.user.id
        instance.delete()
        invalidate_user_cache(user_id)











    @action(detail=False, methods=['get'], url_path='locations')
    def locations(self, request):
        """
        위치 정보가 있는 일기들을 반환합니다 (지도 뷰용).
        """
        diaries = Diary.objects.filter(
            user=request.user,
            latitude__isnull=False,
            longitude__isnull=False
        ).order_by('-created_at')
        
        result = []
        for diary in diaries:
            result.append({
                'id': diary.id,
                'title': diary.title,
                'location_name': diary.location_name,
                'latitude': diary.latitude,
                'longitude': diary.longitude,
                'emotion': diary.emotion,
                'emotion_emoji': diary.get_emotion_display_emoji(),
                'created_at': diary.created_at.strftime('%Y-%m-%d'),
            })
        
        return Response({
            'total_locations': len(result),
            'locations': result
        })



    @action(detail=True, methods=['post'], url_path='generate-image')
    def generate_image(self, request, pk=None):
        """
        특정 일기 항목에 대한 AI 이미지를 비동기로 생성 요청합니다.
        
        [정책]
        - 일기 본문이 50자 미만인 경우 생성을 제한합니다.
        - 이는 테스트성 생성으로 인한 비용 낭비를 막고, 품질을 보장하기 위함입니다.
        """
        diary = self.get_object()
        
        # Check if the user owns this diary
        if diary.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this diary.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            # [Feature: User Tiers] 하루 생성 제한 체크
            from django.utils import timezone
            from ..models import UserPreference
            
            today = timezone.now().date()
            generated_count = DiaryImage.objects.filter(
                diary__user=request.user,
                created_at__date=today
            ).count()
            
            # 사용자 등급 확인
            pref = UserPreference.get_or_create_for_user(request.user)
            limit = 10 if pref.is_premium else 2
            
            if generated_count >= limit:
                 return Response(
                    {
                        'error': 'Daily image generation limit exceeded.',
                        'message': f"하루 생성 한도({limit}장)를 초과했습니다.",
                        'limit': limit,
                        'current': generated_count
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            # 본문 길이 검증 (복호화 후 확인)
            content = diary.decrypt_content()
            if not content or len(content.strip()) < 50:
                return Response(
                    {'error': '일기 내용이 너무 짧습니다. 50자 이상 작성해주세요.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 비동기 태스크 실행
            from ..tasks import generate_image_task
            generate_image_task.delay(diary.id)
            
            # 즉시 응답 (Processing)
            return Response(
                {'message': 'Image generation started', 'status': 'processing'},
                status=status.HTTP_202_ACCEPTED
            )
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='upload-image')
    def upload_image(self, request, pk=None):
        """
        일기에 이미지를 업로드합니다.
        
        Request:
            - image: 이미지 파일 (multipart/form-data)
            - caption: 이미지 설명 (선택)
        
        Response (201):
            {
                "id": 1,
                "url": "/media/diary_uploads/2026/01/image.jpg",
                "caption": "오늘의 사진",
                "is_ai_generated": false,
                "created_at": "2026-01-16T10:00:00Z"
            }
        """
        diary = self.get_object()
        
        # 권한 확인
        if diary.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this diary.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 이미지 파일 확인
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'error': '이미지 파일이 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 파일 크기 제한 (10MB)
        if image_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': '이미지 크기는 10MB를 초과할 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 파일 형식 확인
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': '지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 허용)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 이미지 저장
        caption = request.data.get('caption', '')
        
        diary_image = DiaryImage.objects.create(
            diary=diary,
            uploaded_file=image_file,
            is_ai_generated=False,
            caption=caption[:200] if caption else ''
        )
        
        return Response({
            'id': diary_image.id,
            'url': diary_image.url,
            'caption': diary_image.caption,
            'is_ai_generated': diary_image.is_ai_generated,
            'created_at': diary_image.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='emotion-trend')
    def emotion_trend(self, request):
        """
        감정 트렌드 분석 API
        
        Query Parameters:
            - days: 분석 기간 (기본값: 7)
        
        Response:
            {
                "consecutive_negative": 3,
                "needs_alert": true,
                "dominant_negative": "sad",
                "message": "힘든 시간을 보내고 계시네요...",
                "positive_ratio": 0.3,
                "total_entries": 7,
                "weekly_summary": {
                    "weekday_patterns": {...},
                    "hourly_patterns": {...}
                }
            }
        """
        days = request.query_params.get('days', 7)
        try:
            days = int(days)
        except ValueError:
            days = 7
        
        try:
            from ..services.analysis_service import EmotionTrendAnalyzer
            
            # 트렌드 분석
            trend = EmotionTrendAnalyzer.analyze_recent_trend(request.user, days)
            
            # 주간 요약 추가
            weekly = EmotionTrendAnalyzer.get_weekly_summary(request.user)
            trend['weekly_summary'] = weekly
            
            return Response(trend)
        except Exception as e:
            logger.error(f"Emotion trend analysis failed: {e}")
            return Response({"error": "Failed to analyze emotion trend"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
