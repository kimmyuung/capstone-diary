# diary/tests/test_diary_share_api.py
"""
일기 공유 API 테스트
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from diary.models import Diary


@pytest.fixture
def user():
    """테스트용 사용자 생성"""
    return User.objects.create_user(
        username='shareuser',
        email='share@example.com',
        password='TestPassword123!'
    )


@pytest.fixture
def authenticated_client(user):
    """인증된 API 클라이언트"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def diary(user):
    """테스트용 일기"""
    return Diary.objects.create(
        user=user,
        title='테스트 일기',
        content='테스트 내용입니다.',
        emotion='happy'
    )


@pytest.mark.django_db
class TestDiaryShareAPI:
    """일기 공유 링크 생성/해제 API 테스트"""
    
    def test_create_share_link(self, authenticated_client, diary):
        """공유 링크 생성"""
        response = authenticated_client.post(f'/api/diaries/{diary.id}/share/')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'share_token' in response.data
        assert 'share_url' in response.data
        
        # DB 확인
        diary.refresh_from_db()
        assert diary.share_token is not None
        assert diary.is_public is True
    
    def test_get_existing_share_link(self, authenticated_client, diary):
        """이미 공유 중인 일기"""
        # 먼저 공유 링크 생성
        diary.share_token = 'existing_token_123'
        diary.is_public = True
        diary.save()
        
        response = authenticated_client.post(f'/api/diaries/{diary.id}/share/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['share_token'] == 'existing_token_123'
    
    def test_stop_sharing(self, authenticated_client, diary):
        """공유 해제"""
        # 먼저 공유 링크 생성
        diary.share_token = 'token_to_delete'
        diary.is_public = True
        diary.save()
        
        response = authenticated_client.delete(f'/api/diaries/{diary.id}/share/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # DB 확인
        diary.refresh_from_db()
        assert diary.share_token is None
        assert diary.is_public is False
    
    def test_share_other_user_diary(self, diary):
        """다른 사용자 일기 공유 시도"""
        other_user = User.objects.create_user(
            username='otheruser',
            password='Password123!'
        )
        client = APIClient()
        client.force_authenticate(user=other_user)
        
        response = client.post(f'/api/diaries/{diary.id}/share/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_share_nonexistent_diary(self, authenticated_client):
        """존재하지 않는 일기 공유"""
        response = authenticated_client.post('/api/diaries/99999/share/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSharedDiaryViewAPI:
    """공개 일기 조회 API 테스트"""
    
    def test_view_shared_diary(self, diary):
        """공유된 일기 조회"""
        # 공유 설정
        diary.share_token = 'public_token_abc'
        diary.is_public = True
        diary.save()
        
        client = APIClient()  # 인증 없이
        response = client.get('/api/shared/public_token_abc/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == '테스트 일기'
        assert 'content' in response.data
        assert response.data['emotion'] == 'happy'
    
    def test_view_invalid_token(self):
        """잘못된 토큰으로 조회"""
        client = APIClient()
        response = client.get('/api/shared/invalid_token_xyz/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_view_private_diary(self, diary):
        """비공개 일기 조회 시도"""
        diary.share_token = 'private_token'
        diary.is_public = False  # 비공개
        diary.save()
        
        client = APIClient()
        response = client.get('/api/shared/private_token/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
