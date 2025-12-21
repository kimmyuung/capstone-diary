# diary/tests/test_tasks.py
"""
Celery 태스크 테스트
"""
import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from django.core import mail


@pytest.fixture
def test_user():
    """테스트 사용자"""
    return User.objects.create_user(
        username='taskuser',
        email='task@example.com',
        password='testpass123'
    )


@pytest.mark.django_db(transaction=True)
class TestEmailTasks:
    """이메일 비동기 태스크 테스트"""
    
    @patch('diary.tasks.send_mail')
    def test_send_email_async(self, mock_send):
        """비동기 이메일 발송 테스트"""
        from diary.tasks import send_email_async
        
        mock_send.return_value = 1
        
        # 동기적으로 호출 (Celery 없이)
        result = send_email_async(
            subject='테스트 제목',
            message='테스트 내용',
            recipient_email='test@example.com'
        )
        
        assert result is True
        mock_send.assert_called_once()
    
    @patch('diary.tasks.send_email_async.delay')
    def test_send_verification_email_async(self, mock_delay):
        """인증 이메일 큐 테스트"""
        from diary.tasks import send_verification_email_async
        
        send_verification_email_async(
            username='testuser',
            email='test@example.com',
            token='123456'
        )
        
        # delay가 호출됨
        assert mock_delay.called
    
    @patch('diary.tasks.send_email_async.delay')
    def test_send_password_reset_email_async(self, mock_delay):
        """비밀번호 재설정 이메일 큐 테스트"""
        from diary.tasks import send_password_reset_email_async
        
        send_password_reset_email_async(
            username='testuser',
            email='test@example.com',
            token='654321'
        )
        
        assert mock_delay.called
    
    @patch('diary.tasks.send_email_async.delay')
    def test_send_username_email_async(self, mock_delay):
        """아이디 찾기 이메일 큐 테스트"""
        from diary.tasks import send_username_email_async
        
        send_username_email_async(
            username='testuser',
            email='test@example.com'
        )
        
        assert mock_delay.called


@pytest.mark.django_db(transaction=True)
class TestPDFTasks:
    """PDF 생성 태스크 테스트"""
    
    def test_generate_pdf_async_import(self, test_user):
        """PDF 태스크 import 테스트"""
        from diary.tasks import generate_pdf_async
        assert generate_pdf_async is not None


@pytest.mark.django_db(transaction=True)
class TestCleanupTasks:
    """정리 태스크 테스트"""
    
    @patch('os.listdir')
    @patch('os.path.exists')
    def test_cleanup_old_exports(self, mock_exists, mock_listdir):
        """오래된 내보내기 파일 정리"""
        from diary.tasks import cleanup_old_exports
        
        mock_exists.return_value = False  # 디렉토리 없음
        
        result = cleanup_old_exports(days=7)
        assert result == 0
