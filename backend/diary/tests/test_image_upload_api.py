# diary/tests/test_image_upload_api.py
"""
이미지 업로드 API 테스트
"""
import pytest
from io import BytesIO
from PIL import Image
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from diary.models import Diary, DiaryImage


def create_test_image(format='JPEG', size=(100, 100)):
    """테스트용 이미지 생성"""
    file = BytesIO()
    image = Image.new('RGB', size, color='red')
    image.save(file, format=format)
    file.seek(0)
    return file


@pytest.fixture
def user():
    """테스트용 사용자 생성"""
    return User.objects.create_user(
        username='imageuser',
        email='image@example.com',
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
        title='이미지 테스트 일기',
        content='테스트 내용'
    )


@pytest.mark.django_db
class TestImageUploadAPI:
    """이미지 업로드 API 테스트"""
    
    def test_upload_image_success(self, authenticated_client, diary):
        """이미지 업로드 성공"""
        image_file = create_test_image()
        uploaded_file = SimpleUploadedFile(
            'test.jpg',
            image_file.getvalue(),
            content_type='image/jpeg'
        )
        
        response = authenticated_client.post(
            f'/api/v1/diaries/{diary.id}/upload-image/',
            {'image': uploaded_file, 'caption': '테스트 이미지'},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'id' in response.data
        assert response.data['is_ai_generated'] is False
        
        # DB 확인
        assert DiaryImage.objects.filter(diary=diary, is_ai_generated=False).exists()
    
    def test_upload_png_image(self, authenticated_client, diary):
        """PNG 이미지 업로드"""
        image_file = create_test_image(format='PNG')
        uploaded_file = SimpleUploadedFile(
            'test.png',
            image_file.getvalue(),
            content_type='image/png'
        )
        
        response = authenticated_client.post(
            f'/api/v1/diaries/{diary.id}/upload-image/',
            {'image': uploaded_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_upload_without_image(self, authenticated_client, diary):
        """이미지 없이 업로드 시도"""
        response = authenticated_client.post(
            f'/api/v1/diaries/{diary.id}/upload-image/',
            {},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_upload_invalid_file_type(self, authenticated_client, diary):
        """잘못된 파일 형식"""
        uploaded_file = SimpleUploadedFile(
            'test.txt',
            b'This is not an image',
            content_type='text/plain'
        )
        
        response = authenticated_client.post(
            f'/api/v1/diaries/{diary.id}/upload-image/',
            {'image': uploaded_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_upload_to_other_user_diary(self, diary):
        """다른 사용자 일기에 업로드 시도"""
        other_user = User.objects.create_user(
            username='otheruser',
            password='Password123!'
        )
        client = APIClient()
        client.force_authenticate(user=other_user)
        
        image_file = create_test_image()
        uploaded_file = SimpleUploadedFile(
            'test.jpg',
            image_file.getvalue(),
            content_type='image/jpeg'
        )
        
        response = client.post(
            f'/api/v1/diaries/{diary.id}/upload-image/',
            {'image': uploaded_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_upload_to_nonexistent_diary(self, authenticated_client):
        """존재하지 않는 일기에 업로드"""
        image_file = create_test_image()
        uploaded_file = SimpleUploadedFile(
            'test.jpg',
            image_file.getvalue(),
            content_type='image/jpeg'
        )
        
        response = authenticated_client.post(
            '/api/v1/diaries/99999/upload-image/',
            {'image': uploaded_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
