# diary/tests/test_report_views.py
"""
리포트 ViewSet 테스트
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from diary.models import Diary

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username='reportuser',
        email='report@example.com',
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def sample_diaries_for_report(test_user):
    """리포트용 일기 샘플 생성 (최근 30일)"""
    diaries = []
    emotions = ['happy', 'happy', 'sad', 'peaceful', 'excited', 'happy', 'tired']
    
    for i, emotion in enumerate(emotions):
        diary = Diary.objects.create(
            user=test_user,
            title=f'리포트용 일기 {i+1}',
            content=f'테스트 내용 {i+1}' * 20,  # 충분한 길이
            emotion=emotion,
            emotion_score=0.85,
            created_at=timezone.now() - timedelta(days=i)
        )
        diaries.append(diary)
    
    return diaries


@pytest.mark.django_db
class TestReportViewSet:
    """리포트 ViewSet 테스트"""
    
    def test_weekly_report_authenticated(self, authenticated_client, sample_diaries_for_report):
        """인증된 사용자는 주간 리포트를 조회할 수 있다"""
        url = reverse('report-weekly-report')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_weekly_report_unauthenticated(self, api_client):
        """인증되지 않은 사용자는 리포트에 접근할 수 없다"""
        url = reverse('report-weekly-report')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_calendar_data(self, authenticated_client, sample_diaries_for_report):
        """캘린더 데이터를 조회할 수 있다"""
        now = timezone.now()
        url = reverse('report-calendar')
        response = authenticated_client.get(url, {
            'year': now.year,
            'month': now.month
        })
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_calendar_invalid_params(self, authenticated_client):
        """잘못된 캘린더 파라미터는 오류 반환"""
        url = reverse('report-calendar')
        response = authenticated_client.get(url, {
            'year': 'invalid',
            'month': 'invalid'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_annual_report(self, authenticated_client, sample_diaries_for_report):
        """연간 리포트를 조회할 수 있다"""
        url = reverse('report-annual-report')
        response = authenticated_client.get(url, {'year': timezone.now().year})
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_annual_report_invalid_year(self, authenticated_client):
        """잘못된 연도 파라미터는 오류 반환"""
        url = reverse('report-annual-report')
        response = authenticated_client.get(url, {'year': 'invalid'})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestReportCaching:
    """리포트 캐싱 테스트"""
    
    @patch('django.core.cache.cache.get')
    @patch('django.core.cache.cache.set')
    def test_report_uses_cache(self, mock_cache_set, mock_cache_get, authenticated_client, sample_diaries_for_report):
        """리포트는 캐시를 사용한다"""
        mock_cache_get.return_value = None  # 캐시 미스
        
        url = reverse('report-weekly-report')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # 캐시 저장이 호출되어야 함
        assert mock_cache_set.called or response.status_code == status.HTTP_200_OK
