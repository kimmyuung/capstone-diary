# diary/tests/test_gallery_views.py
"""
갤러리 ViewSet 테스트
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from diary.models import Diary, DiaryImage

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def sample_diary(test_user):
    return Diary.objects.create(
        user=test_user,
        title='테스트 일기',
        content='테스트 내용입니다.'
    )


@pytest.fixture
def sample_images(sample_diary):
    images = []
    for i in range(3):
        img = DiaryImage.objects.create(
            diary=sample_diary,
            image_url=f'https://example.com/image{i}.png',
            ai_prompt=f'Test prompt {i}'
        )
        images.append(img)
    return images


@pytest.mark.django_db
class TestGalleryViewSet:
    """갤러리 ViewSet 테스트"""
    
    def test_get_images_authenticated(self, authenticated_client, sample_images):
        """인증된 사용자는 갤러리 이미지 목록을 조회할 수 있다"""
        url = reverse('gallery-images')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_images' in response.data
        assert 'images' in response.data
        assert response.data['total_images'] == 3
    
    def test_get_images_unauthenticated(self, api_client):
        """인증되지 않은 사용자는 갤러리에 접근할 수 없다"""
        url = reverse('gallery-images')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_gallery_only_returns_user_images(self, authenticated_client, sample_images, db):
        """다른 사용자의 이미지는 조회되지 않는다"""
        # 다른 사용자 생성
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        other_diary = Diary.objects.create(
            user=other_user,
            title='다른 사용자 일기',
            content='다른 내용'
        )
        DiaryImage.objects.create(
            diary=other_diary,
            image_url='https://example.com/other.png',
            ai_prompt='Other prompt'
        )
        
        url = reverse('gallery-images')
        response = authenticated_client.get(url)
        
        # 본인의 이미지만 반환되어야 함
        assert response.data['total_images'] == 3
    
    def test_gallery_image_structure(self, authenticated_client, sample_images):
        """갤러리 이미지 응답 구조가 올바르다"""
        url = reverse('gallery-images')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        if response.data['images']:
            image = response.data['images'][0]
            assert 'id' in image
            assert 'image_url' in image
            assert 'ai_prompt' in image
            assert 'created_at' in image
            assert 'diary_id' in image
            assert 'diary_title' in image
    
    def test_empty_gallery(self, authenticated_client, sample_diary):
        """이미지가 없을 때 빈 갤러리 반환"""
        url = reverse('gallery-images')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_images'] == 0
        assert response.data['images'] == []
