"""
인증 API 테스트
- 회원가입, 이메일 인증, 비밀번호 재설정 등
"""
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from diary.models import EmailVerificationToken, PasswordResetToken


class RegisterViewTestCase(TestCase):
    """회원가입 API 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/register/'
    
    @patch('diary.views.auth_views.RegisterRateThrottle.allow_request', return_value=True)
    @patch('diary.email_service.send_email_verification')
    def test_register_success(self, mock_send_email, mock_throttle):
        """회원가입 성공 테스트"""
        mock_send_email.return_value = True
        
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('requires_verification', response.data)
        self.assertTrue(response.data['requires_verification'])
        
        # 사용자가 생성되었지만 비활성 상태인지 확인
        user = User.objects.get(username='testuser')
        self.assertFalse(user.is_active)
    
    @patch('diary.views.auth_views.RegisterRateThrottle.allow_request', return_value=True)
    def test_register_password_mismatch(self, mock_throttle):
        """비밀번호 불일치 테스트"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'DifferentPass123!',
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    @patch('diary.views.auth_views.RegisterRateThrottle.allow_request', return_value=True)
    def test_register_duplicate_username(self, mock_throttle):
        """중복 사용자명 테스트"""
        User.objects.create_user(username='existinguser', email='existing@example.com', password='pass123')
        
        data = {
            'username': 'existinguser',
            'email': 'new@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EmailVerifyViewTestCase(TestCase):
    """이메일 인증 API 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.verify_url = '/api/email/verify/'
        
        # 비활성 사용자 생성
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            is_active=False
        )
        
        # 인증 토큰 생성
        self.token = EmailVerificationToken.generate_token(self.user)
    
    @patch('diary.views.auth_views.LoginRateThrottle.allow_request', return_value=True)
    def test_verify_success(self, mock_throttle):
        """이메일 인증 성공 테스트"""
        data = {
            'email': 'test@example.com',
            'code': self.token.token,
        }
        
        response = self.client.post(self.verify_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 사용자 활성화 확인
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
    
    @patch('diary.views.auth_views.LoginRateThrottle.allow_request', return_value=True)
    def test_verify_invalid_code(self, mock_throttle):
        """잘못된 인증 코드 테스트"""
        data = {
            'email': 'test@example.com',
            'code': '000000',  # 잘못된 코드
        }
        
        response = self.client.post(self.verify_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    @patch('diary.views.auth_views.LoginRateThrottle.allow_request', return_value=True)
    def test_verify_nonexistent_email(self, mock_throttle):
        """존재하지 않는 이메일 테스트"""
        data = {
            'email': 'nonexistent@example.com',
            'code': '123456',
        }
        
        response = self.client.post(self.verify_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetTestCase(TestCase):
    """비밀번호 재설정 API 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.reset_request_url = '/api/password/reset-request/'
        self.reset_confirm_url = '/api/password/reset-confirm/'
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='OldPass123!'
        )
    
    @patch('diary.views.auth_views.PasswordResetRateThrottle.allow_request', return_value=True)
    @patch('diary.email_service.send_password_reset_email')
    def test_reset_request_success(self, mock_send_email, mock_throttle):
        """비밀번호 재설정 요청 성공 테스트"""
        mock_send_email.return_value = True
        
        data = {'email': 'test@example.com'}
        
        response = self.client.post(self.reset_request_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
    
    @patch('diary.views.auth_views.PasswordResetRateThrottle.allow_request', return_value=True)
    def test_reset_request_nonexistent_email(self, mock_throttle):
        """존재하지 않는 이메일로 재설정 요청 테스트"""
        data = {'email': 'nonexistent@example.com'}
        
        response = self.client.post(self.reset_request_url, data, format='json')
        
        # 보안상 존재하지 않는 이메일도 성공 응답
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    @patch('diary.views.auth_views.PasswordResetRateThrottle.allow_request', return_value=True)
    def test_reset_confirm_success(self, mock_throttle):
        """비밀번호 재설정 확인 성공 테스트"""
        # 토큰 생성
        token = PasswordResetToken.generate_token(self.user)
        
        data = {
            'email': 'test@example.com',
            'code': token.token,
            'new_password': 'NewPass456!',
        }
        
        response = self.client.post(self.reset_confirm_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 새 비밀번호로 로그인 확인
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass456!'))
    
    @patch('diary.views.auth_views.PasswordResetRateThrottle.allow_request', return_value=True)
    def test_reset_confirm_invalid_code(self, mock_throttle):
        """잘못된 코드로 비밀번호 재설정 테스트"""
        data = {
            'email': 'test@example.com',
            'code': '000000',
            'new_password': 'NewPass456!',
        }
        
        response = self.client.post(self.reset_confirm_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FindUsernameTestCase(TestCase):
    """아이디 찾기 API 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.find_url = '/api/username/find/'
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    @patch('diary.views.auth_views.PasswordResetRateThrottle.allow_request', return_value=True)
    @patch('diary.email_service.send_username_email')
    def test_find_username_success(self, mock_send_email, mock_throttle):
        """아이디 찾기 성공 테스트"""
        mock_send_email.return_value = True
        
        data = {'email': 'test@example.com'}
        
        response = self.client.post(self.find_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
    
    @patch('diary.views.auth_views.PasswordResetRateThrottle.allow_request', return_value=True)
    def test_find_username_nonexistent(self, mock_throttle):
        """존재하지 않는 이메일로 아이디 찾기 테스트"""
        data = {'email': 'nonexistent@example.com'}
        
        response = self.client.post(self.find_url, data, format='json')
        
        # 보안상 존재하지 않는 이메일도 성공 응답 (계정 존재 여부 노출 방지)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

