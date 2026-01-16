# diary/tests/test_chat_session_api.py
"""
채팅 세션 API 테스트
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from diary.models import ChatSession, ChatMessage


@pytest.fixture
def user():
    """테스트용 사용자 생성"""
    return User.objects.create_user(
        username='chatuser',
        email='chat@example.com',
        password='TestPassword123!'
    )


@pytest.fixture
def authenticated_client(user):
    """인증된 API 클라이언트"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def chat_session(user):
    """테스트용 채팅 세션"""
    return ChatSession.objects.create(
        user=user,
        title='테스트 대화'
    )


@pytest.fixture
def chat_messages(chat_session):
    """테스트용 채팅 메시지"""
    msgs = [
        ChatMessage.objects.create(session=chat_session, role='user', content='안녕하세요'),
        ChatMessage.objects.create(session=chat_session, role='assistant', content='안녕하세요! 무엇을 도와드릴까요?'),
    ]
    return msgs


@pytest.mark.django_db
class TestChatSessionListAPI:
    """채팅 세션 목록 API 테스트"""
    
    def test_list_sessions_empty(self, authenticated_client):
        """세션이 없는 경우"""
        response = authenticated_client.get('/api/chat/sessions/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert response.data['sessions'] == []
    
    def test_list_sessions_with_data(self, authenticated_client, chat_session, chat_messages):
        """세션이 있는 경우"""
        response = authenticated_client.get('/api/chat/sessions/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['sessions'][0]['title'] == '테스트 대화'
        assert response.data['sessions'][0]['message_count'] == 2
    
    def test_list_sessions_unauthenticated(self):
        """인증되지 않은 요청"""
        client = APIClient()
        response = client.get('/api/chat/sessions/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestChatSessionCreateAPI:
    """채팅 세션 생성 API 테스트"""
    
    def test_create_session_success(self, authenticated_client):
        """세션 생성 성공"""
        response = authenticated_client.post('/api/chat/sessions/', {
            'title': '새 대화'
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == '새 대화'
        assert 'id' in response.data
    
    def test_create_session_default_title(self, authenticated_client):
        """기본 제목으로 세션 생성"""
        response = authenticated_client.post('/api/chat/sessions/', {})
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == '새 대화'


@pytest.mark.django_db
class TestChatSessionDetailAPI:
    """채팅 세션 상세 API 테스트"""
    
    def test_retrieve_session(self, authenticated_client, chat_session, chat_messages):
        """세션 상세 조회"""
        response = authenticated_client.get(f'/api/chat/sessions/{chat_session.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == chat_session.id
        assert response.data['title'] == '테스트 대화'
        assert len(response.data['messages']) == 2
    
    def test_retrieve_session_not_found(self, authenticated_client):
        """존재하지 않는 세션"""
        response = authenticated_client.get('/api/chat/sessions/99999/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_retrieve_other_user_session(self, chat_session):
        """다른 사용자의 세션 접근 시도"""
        other_user = User.objects.create_user(
            username='otheruser',
            password='Password123!'
        )
        client = APIClient()
        client.force_authenticate(user=other_user)
        
        response = client.get(f'/api/chat/sessions/{chat_session.id}/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestChatSessionDeleteAPI:
    """채팅 세션 삭제 API 테스트"""
    
    def test_delete_session(self, authenticated_client, chat_session):
        """세션 삭제 (소프트 삭제)"""
        response = authenticated_client.delete(f'/api/chat/sessions/{chat_session.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # 소프트 삭제 확인
        chat_session.refresh_from_db()
        assert chat_session.is_active is False
    
    def test_delete_session_not_found(self, authenticated_client):
        """존재하지 않는 세션 삭제"""
        response = authenticated_client.delete('/api/chat/sessions/99999/')
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
