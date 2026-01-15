# diary/views/preference_views.py
"""
사용자 설정 관련 API 뷰
- 테마 설정 (다크/라이트 모드)
- 알림 설정
- 기타 개인화 설정
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..models import UserPreference
from ..serializers import UserPreferenceSerializer


class UserPreferenceView(APIView):
    """
    사용자 설정 API
    
    GET: 현재 설정 조회
    PUT/PATCH: 설정 업데이트
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        현재 사용자의 설정 조회
        
        GET /api/preferences/
        
        Response:
            {
                "theme": "dark",
                "language": "ko",
                "push_enabled": true,
                "daily_reminder_enabled": false,
                "daily_reminder_time": null,
                "auto_emotion_analysis": true,
                "show_location": true,
                "updated_at": "2024-12-22T..."
            }
        """
        preference = UserPreference.get_or_create_for_user(request.user)
        serializer = UserPreferenceSerializer(preference)
        return Response(serializer.data)
    
    def put(self, request):
        """
        사용자 설정 전체 업데이트
        
        PUT /api/preferences/
        """
        preference = UserPreference.get_or_create_for_user(request.user)
        serializer = UserPreferenceSerializer(preference, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        """
        사용자 설정 부분 업데이트
        
        PATCH /api/preferences/
        
        Request Body (예시):
            {
                "theme": "dark"
            }
        """
        preference = UserPreference.get_or_create_for_user(request.user)
        serializer = UserPreferenceSerializer(
            preference, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ThemeView(APIView):
    """
    테마 설정 전용 API (간편 접근용)
    
    GET: 현재 테마 조회
    PUT: 테마 변경
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        현재 테마 조회
        
        GET /api/preferences/theme/
        
        Response:
            {
                "theme": "dark",
                "theme_display": "다크 모드"
            }
        """
        preference = UserPreference.get_or_create_for_user(request.user)
        theme_display = dict(UserPreference.THEME_CHOICES).get(preference.theme, preference.theme)
        
        return Response({
            'theme': preference.theme,
            'theme_display': theme_display
        })
    
    def put(self, request):
        """
        테마 변경
        
        PUT /api/preferences/theme/
        
        Request Body:
            {
                "theme": "dark"  // "light", "dark", "system"
            }
        """
        theme = request.data.get('theme')
        
        valid_themes = [choice[0] for choice in UserPreference.THEME_CHOICES]
        if theme not in valid_themes:
            return Response(
                {'error': f'유효하지 않은 테마입니다. 가능한 값: {", ".join(valid_themes)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        preference = UserPreference.get_or_create_for_user(request.user)
        preference.theme = theme
        preference.save()
        
        theme_display = dict(UserPreference.THEME_CHOICES).get(theme, theme)
        
        return Response({
            'theme': preference.theme,
            'theme_display': theme_display,
            'message': f'{theme_display}로 변경되었습니다.'
        })


class StreakView(APIView):
    """
    스트릭(연속 작성) 조회 API
    
    GET: 현재 스트릭 정보 조회
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        현재 스트릭 정보 조회
        
        GET /api/preferences/streak/
        
        Response:
            {
                "current_streak": 5,
                "max_streak": 10,
                "last_diary_date": "2026-01-14",
                "is_streak_active": true
            }
        """
        from datetime import date, timedelta
        
        preference = UserPreference.get_or_create_for_user(request.user)
        today = date.today()
        
        # 스트릭이 끊겼는지 확인 (오늘 또는 어제 작성했으면 활성)
        is_streak_active = False
        if preference.last_diary_date:
            days_diff = (today - preference.last_diary_date).days
            is_streak_active = days_diff <= 1
        
        return Response({
            'current_streak': preference.current_streak,
            'max_streak': preference.max_streak,
            'last_diary_date': preference.last_diary_date.isoformat() if preference.last_diary_date else None,
            'is_streak_active': is_streak_active
        })


def update_user_streak(user):
    """
    사용자의 스트릭을 업데이트하는 헬퍼 함수
    일기 생성 시 호출
    """
    from datetime import date, timedelta
    
    preference = UserPreference.get_or_create_for_user(user)
    today = date.today()
    
    if preference.last_diary_date is None:
        # 첫 일기
        preference.current_streak = 1
        preference.max_streak = 1
    elif preference.last_diary_date == today:
        # 오늘 이미 작성함 - 변경 없음
        pass
    elif preference.last_diary_date == today - timedelta(days=1):
        # 어제 작성 + 오늘 작성 = 연속
        preference.current_streak += 1
        if preference.current_streak > preference.max_streak:
            preference.max_streak = preference.current_streak
    else:
        # 스트릭 끊김 - 다시 1부터
        preference.current_streak = 1
    
    preference.last_diary_date = today
    preference.save()
    
    return preference.current_streak, preference.max_streak
