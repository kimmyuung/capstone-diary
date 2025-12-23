# diary/tests/test_push_service.py
"""
푸시 알림 서비스 테스트
- send_push_notification
- send_push_to_user
- send_bulk_push
- notify_* 편의 함수들
"""
import sys
import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User


@pytest.fixture
def test_user(db):
    """테스트 사용자"""
    return User.objects.create_user(
        username='pushuser',
        email='push@example.com',
        password='testpass123'
    )


@pytest.fixture
def mock_requests():
    """requests 모듈 모킹"""
    mock = MagicMock()
    mock.RequestException = Exception
    return mock


class TestSendPushNotification:
    """단일 푸시 알림 전송 테스트"""
    
    def test_send_push_success(self, mock_requests):
        """푸시 알림 전송 성공"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            # 모듈 다시 로드하여 모킹된 requests 사용
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            mock_response = MagicMock()
            mock_response.json.return_value = {'data': {'status': 'ok'}}
            mock_response.raise_for_status = MagicMock()
            mock_requests.post.return_value = mock_response
            
            result = push_service.send_push_notification(
                push_token='ExponentPushToken[xxxxxx]',
                title='테스트 알림',
                body='테스트 메시지입니다.'
            )
            
            assert 'data' in result
            mock_requests.post.assert_called_once()
    
    def test_send_push_with_data(self, mock_requests):
        """추가 데이터와 함께 푸시 전송"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            mock_response = MagicMock()
            mock_response.json.return_value = {'data': {'status': 'ok'}}
            mock_response.raise_for_status = MagicMock()
            mock_requests.post.return_value = mock_response
            
            result = push_service.send_push_notification(
                push_token='ExponentPushToken[xxxxxx]',
                title='알림',
                body='메시지',
                data={'type': 'diary', 'diary_id': 123}
            )
            
            call_kwargs = mock_requests.post.call_args[1]
            assert call_kwargs['json']['data'] == {'type': 'diary', 'diary_id': 123}
    
    def test_send_push_with_badge(self, mock_requests):
        """배지 카운트와 함께 푸시 전송"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            mock_response = MagicMock()
            mock_response.json.return_value = {'data': {'status': 'ok'}}
            mock_response.raise_for_status = MagicMock()
            mock_requests.post.return_value = mock_response
            
            result = push_service.send_push_notification(
                push_token='ExponentPushToken[xxxxxx]',
                title='알림',
                body='메시지',
                badge=5
            )
            
            call_kwargs = mock_requests.post.call_args[1]
            assert call_kwargs['json']['badge'] == 5
    
    def test_send_push_request_error(self, mock_requests):
        """요청 에러 시 에러 딕셔너리 반환"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            mock_requests.post.side_effect = Exception("Connection failed")
            
            result = push_service.send_push_notification(
                push_token='ExponentPushToken[xxxxxx]',
                title='알림',
                body='메시지'
            )
            
            assert 'error' in result
    
    def test_send_push_correct_headers(self, mock_requests):
        """올바른 헤더로 요청"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            mock_response = MagicMock()
            mock_response.json.return_value = {}
            mock_response.raise_for_status = MagicMock()
            mock_requests.post.return_value = mock_response
            
            push_service.send_push_notification(
                push_token='ExponentPushToken[xxxxxx]',
                title='알림',
                body='메시지'
            )
            
            call_kwargs = mock_requests.post.call_args[1]
            headers = call_kwargs['headers']
            assert headers['Content-Type'] == 'application/json'
            assert headers['Accept'] == 'application/json'


@pytest.mark.django_db
class TestSendPushToUser:
    """특정 사용자에게 푸시 전송 테스트"""
    
    def test_send_to_user_single_device(self, test_user, mock_requests):
        """단일 기기에 푸시 전송"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'PushToken') as mock_push_token:
                with patch.object(push_service, 'send_push_notification') as mock_send_push:
                    mock_queryset = MagicMock()
                    mock_queryset.values_list.return_value = ['ExponentPushToken[device1]']
                    mock_push_token.objects.filter.return_value = mock_queryset
                    
                    mock_send_push.return_value = {'data': {'status': 'ok'}}
                    
                    results = push_service.send_push_to_user(
                        user_id=test_user.id,
                        title='사용자 알림',
                        body='메시지'
                    )
                    
                    assert len(results) == 1
                    mock_send_push.assert_called_once_with(
                        'ExponentPushToken[device1]',
                        '사용자 알림',
                        '메시지',
                        None
                    )
    
    def test_send_to_user_multiple_devices(self, test_user, mock_requests):
        """여러 기기에 푸시 전송"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'PushToken') as mock_push_token:
                with patch.object(push_service, 'send_push_notification') as mock_send_push:
                    mock_queryset = MagicMock()
                    mock_queryset.values_list.return_value = [
                        'ExponentPushToken[device1]',
                        'ExponentPushToken[device2]',
                        'ExponentPushToken[device3]'
                    ]
                    mock_push_token.objects.filter.return_value = mock_queryset
                    
                    mock_send_push.return_value = {'data': {'status': 'ok'}}
                    
                    results = push_service.send_push_to_user(
                        user_id=test_user.id,
                        title='알림',
                        body='메시지'
                    )
                    
                    assert len(results) == 3
                    assert mock_send_push.call_count == 3
    
    def test_send_to_user_no_tokens(self, test_user, mock_requests):
        """등록된 토큰이 없는 경우"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'PushToken') as mock_push_token:
                with patch.object(push_service, 'send_push_notification') as mock_send_push:
                    mock_queryset = MagicMock()
                    mock_queryset.values_list.return_value = []
                    mock_push_token.objects.filter.return_value = mock_queryset
                    
                    results = push_service.send_push_to_user(
                        user_id=test_user.id,
                        title='알림',
                        body='메시지'
                    )
                    
                    assert len(results) == 0
                    mock_send_push.assert_not_called()


@pytest.mark.django_db
class TestSendBulkPush:
    """일괄 푸시 전송 테스트"""
    
    def test_bulk_push_success(self, test_user, mock_requests):
        """일괄 푸시 성공"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'PushToken') as mock_push_token:
                mock_queryset = MagicMock()
                mock_queryset.values_list.return_value = [
                    'ExponentPushToken[device1]',
                    'ExponentPushToken[device2]'
                ]
                mock_push_token.objects.filter.return_value = mock_queryset
                
                mock_response = MagicMock()
                mock_response.raise_for_status = MagicMock()
                mock_requests.post.return_value = mock_response
                
                count = push_service.send_bulk_push(
                    user_ids=[1, 2, 3],
                    title='일괄 알림',
                    body='모든 사용자에게 전송'
                )
                
                assert count == 2
                mock_requests.post.assert_called_once()
    
    def test_bulk_push_no_tokens(self, test_user, mock_requests):
        """토큰이 없는 경우"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'PushToken') as mock_push_token:
                mock_queryset = MagicMock()
                mock_queryset.values_list.return_value = []
                mock_push_token.objects.filter.return_value = mock_queryset
                
                count = push_service.send_bulk_push(
                    user_ids=[1, 2, 3],
                    title='알림',
                    body='메시지'
                )
                
                assert count == 0
                mock_requests.post.assert_not_called()
    
    def test_bulk_push_batch_size(self, test_user, mock_requests):
        """100개 이상일 때 배치 처리"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'PushToken') as mock_push_token:
                tokens = [f'ExponentPushToken[device{i}]' for i in range(150)]
                mock_queryset = MagicMock()
                mock_queryset.values_list.return_value = tokens
                mock_push_token.objects.filter.return_value = mock_queryset
                
                mock_response = MagicMock()
                mock_response.raise_for_status = MagicMock()
                mock_requests.post.return_value = mock_response
                
                count = push_service.send_bulk_push(
                    user_ids=[1],
                    title='알림',
                    body='메시지'
                )
                
                assert count == 150
                assert mock_requests.post.call_count == 2


class TestNotifyFunctions:
    """편의 함수들 테스트"""
    
    def test_notify_diary_reminder(self, mock_requests):
        """일기 리마인더 알림"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'send_push_to_user') as mock_send:
                mock_send.return_value = [{'data': {'status': 'ok'}}]
                
                result = push_service.notify_diary_reminder(user_id=1)
                
                mock_send.assert_called_once()
                call_args, call_kwargs = mock_send.call_args
                
                # user_id는 첫 번째 위치 인자
                assert call_args[0] == 1
                # title, body, data는 키워드 인자
                assert '일기' in call_kwargs['title']
                assert call_kwargs['data']['type'] == 'diary_reminder'
    
    def test_notify_image_complete(self, mock_requests):
        """AI 이미지 생성 완료 알림"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'send_push_to_user') as mock_send:
                mock_send.return_value = [{'data': {'status': 'ok'}}]
                
                result = push_service.notify_image_complete(user_id=1, diary_title="행복한 하루")
                
                mock_send.assert_called_once()
                call_args, call_kwargs = mock_send.call_args
                
                assert call_args[0] == 1
                assert '행복한 하루' in call_kwargs['body']
                assert call_kwargs['data']['type'] == 'image_complete'
    
    def test_notify_weekly_report(self, mock_requests):
        """주간 리포트 알림"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            with patch.object(push_service, 'send_push_to_user') as mock_send:
                mock_send.return_value = [{'data': {'status': 'ok'}}]
                
                result = push_service.notify_weekly_report(user_id=1)
                
                mock_send.assert_called_once()
                call_args, call_kwargs = mock_send.call_args
                
                assert call_args[0] == 1
                assert '리포트' in call_kwargs['title']
                assert call_kwargs['data']['type'] == 'weekly_report'


class TestExpoUrl:
    """Expo Push URL 상수 테스트"""
    
    def test_expo_push_url_is_correct(self, mock_requests):
        """Expo Push URL이 올바른지 확인"""
        with patch.dict(sys.modules, {'requests': mock_requests}):
            import importlib
            import diary.push_service as push_service
            importlib.reload(push_service)
            
            assert push_service.EXPO_PUSH_URL == 'https://exp.host/--/api/v2/push/send'

