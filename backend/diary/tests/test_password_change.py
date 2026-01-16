# diary/tests/test_password_change.py
"""
비밀번호 변경 API 테스트
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


@pytest.fixture
def user():
    """테스트용 사용자 생성"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='OldPassword123!'
    )


@pytest.fixture
def authenticated_client(user):
    """인증된 API 클라이언트"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestChangePasswordAPI:
    """비밀번호 변경 API 테스트"""
    
    def test_change_password_success(self, authenticated_client, user):
        """정상적인 비밀번호 변경"""
        response = authenticated_client.post('/api/password/change/', {
            'current_password': 'OldPassword123!',
            'new_password': 'NewPassword456!',
            'confirm_password': 'NewPassword456!'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == '비밀번호가 성공적으로 변경되었습니다.'
        
        # 새 비밀번호로 로그인 확인
        user.refresh_from_db()
        assert user.check_password('NewPassword456!')
    
    def test_change_password_wrong_current(self, authenticated_client):
        """현재 비밀번호 불일치"""
        response = authenticated_client.post('/api/password/change/', {
            'current_password': 'WrongPassword!',
            'new_password': 'NewPassword456!',
            'confirm_password': 'NewPassword456!'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'current_password' in response.data
    
    def test_change_password_mismatch(self, authenticated_client):
        """새 비밀번호 확인 불일치"""
        response = authenticated_client.post('/api/password/change/', {
            'current_password': 'OldPassword123!',
            'new_password': 'NewPassword456!',
            'confirm_password': 'DifferentPassword789!'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'new_password' in response.data
    
    def test_change_password_too_short(self, authenticated_client):
        """너무 짧은 새 비밀번호"""
        response = authenticated_client.post('/api/password/change/', {
            'current_password': 'OldPassword123!',
            'new_password': '123',
            'confirm_password': '123'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_change_password_unauthenticated(self):
        """인증되지 않은 요청"""
        client = APIClient()
        response = client.post('/api/password/change/', {
            'current_password': 'OldPassword123!',
            'new_password': 'NewPassword456!',
            'confirm_password': 'NewPassword456!'
        })
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_change_password_missing_fields(self, authenticated_client):
        """필수 필드 누락"""
        response = authenticated_client.post('/api/password/change/', {
            'current_password': 'OldPassword123!'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
