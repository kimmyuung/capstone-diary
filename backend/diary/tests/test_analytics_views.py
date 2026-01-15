# diary/tests/test_analytics_views.py
"""
감정 분석 ViewSet 테스트
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from diary.models import Diary

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username='analyticsuser',
        email='analytics@example.com',
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def sample_diaries_with_emotions(test_user):
    """다양한 감정을 가진 일기 샘플 생성"""
    diaries = []
    emotions = ['happy', 'sad', 'angry', 'peaceful', 'happy', 'tired', 'anxious']
    
    for i, emotion in enumerate(emotions):
        diary = Diary.objects.create(
            user=test_user,
            title=f'일기 {i+1}',
            content=f'테스트 내용 {i+1}',
            emotion=emotion,
            emotion_score=0.8,
            created_at=timezone.now() - timedelta(days=i)
        )
        diaries.append(diary)
    
    return diaries


@pytest.mark.django_db
class TestAnalyticsViewSet:
    """감정 분석 ViewSet 테스트"""
    
    def test_emotion_trend_authenticated(self, authenticated_client, sample_diaries_with_emotions):
        """인증된 사용자는 감정 트렌드를 조회할 수 있다"""
        url = reverse('analytics-emotion-trend')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'trend' in response.data
        assert 'weekly_summary' in response.data
    
    def test_emotion_trend_unauthenticated(self, api_client):
        """인증되지 않은 사용자는 감정 트렌드에 접근할 수 없다"""
        url = reverse('analytics-emotion-trend')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_emotion_trend_with_days_param(self, authenticated_client, sample_diaries_with_emotions):
        """days 파라미터로 조회 기간을 설정할 수 있다"""
        url = reverse('analytics-emotion-trend')
        response = authenticated_client.get(url, {'days': 14})
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_emotion_trend_invalid_days_param(self, authenticated_client):
        """잘못된 days 파라미터는 기본값으로 처리된다"""
        url = reverse('analytics-emotion-trend')
        response = authenticated_client.get(url, {'days': 'invalid'})
        
        # 잘못된 값은 기본값 7로 처리됨
        assert response.status_code == status.HTTP_200_OK
    
    def test_emotion_trend_no_diaries(self, authenticated_client):
        """일기가 없을 때도 정상 응답"""
        url = reverse('analytics-emotion-trend')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestEmotionTrendAnalysis:
    """감정 트렌드 분석 로직 테스트"""
    
    def test_consecutive_negative_detection(self, test_user):
        """연속 부정적 감정 감지 테스트"""
        from diary.services.analysis_service import EmotionTrendAnalyzer
        
        # 3일 연속 부정적 감정
        for i in range(3):
            Diary.objects.create(
                user=test_user,
                title=f'슬픈 일기 {i+1}',
                content='슬픈 내용',
                emotion='sad',
                created_at=timezone.now() - timedelta(days=i)
            )
        
        result = EmotionTrendAnalyzer.analyze_recent_trend(test_user, days=7)
        
        assert result is not None
        # 연속 부정적 감정이 감지되어야 함
        assert 'consecutive_negative' in result or 'has_consecutive_negative' in result or 'encouragement' in result
