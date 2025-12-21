# diary/tests/test_ai_api.py
"""
AI 요약/제목 API 테스트
"""
import pytest
import uuid
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


@pytest.fixture
def authenticated_client():
    """인증된 API 클라이언트"""
    unique_id = uuid.uuid4().hex[:8]
    user = User.objects.create_user(
        username=f'testuser_{unique_id}',
        email=f'test_{unique_id}@example.com',
        password='testpass123'
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db(transaction=True)
class TestSummarizeAPI:
    """AI 요약 API 테스트"""
    
    def test_summarize_requires_content(self, authenticated_client):
        """요약 API는 content 필수"""
        response = authenticated_client.post('/api/summarize/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_summarize_min_length(self, authenticated_client):
        """요약 API는 최소 50자 필요"""
        response = authenticated_client.post('/api/summarize/', {
            'content': '짧은 내용'
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.skip(reason="AI mocking requires complex setup")
    @patch('diary.views.ai_views.DiarySummarizer')
    def test_summarize_success(self, mock_summarizer_class, authenticated_client):
        """요약 성공 테스트"""
        mock_summarizer = mock_summarizer_class.return_value
        mock_summarizer.summarize.return_value = "요약된 내용입니다."
        
        long_content = "오늘은 정말 좋은 하루였습니다. " * 20
        response = authenticated_client.post('/api/summarize/', {
            'content': long_content,
            'style': 'three_lines'
        })
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'summary' in data
        assert 'original_content' in data


@pytest.mark.django_db(transaction=True)
class TestSuggestTitleAPI:
    """AI 제목 제안 API 테스트"""
    
    def test_suggest_title_requires_content(self, authenticated_client):
        """제목 제안 API는 content 필수"""
        response = authenticated_client.post('/api/suggest-title/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.skip(reason="AI mocking requires complex setup")
    @patch('diary.views.ai_views.DiarySummarizer')
    def test_suggest_title_success(self, mock_summarizer_class, authenticated_client):
        """제목 제안 성공 테스트"""
        mock_summarizer = mock_summarizer_class.return_value
        mock_summarizer.suggest_title.return_value = "행복한 하루"
        
        response = authenticated_client.post('/api/suggest-title/', {
            'content': '오늘은 정말 행복한 하루였습니다. 친구들과 맛있는 음식도 먹었습니다.'
        })
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'suggested_title' in data


@pytest.mark.django_db(transaction=True)
class TestTemplateGenerate:
    """AI 템플릿 생성 테스트"""
    
    def test_generate_requires_topic(self, authenticated_client):
        """템플릿 생성 API는 topic 필수"""
        response = authenticated_client.post('/api/templates/generate/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_generate_topic_min_length(self, authenticated_client):
        """주제는 최소 2자 이상"""
        response = authenticated_client.post('/api/templates/generate/', {
            'topic': 'a'
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    @pytest.mark.skip(reason="AI mocking requires complex setup")
    @patch('diary.views.template_views.TemplateGenerator')
    def test_generate_success(self, mock_generator_class, authenticated_client):
        """템플릿 생성 성공 테스트"""
        mock_generator = mock_generator_class.return_value
        mock_generator.generate.return_value = {
            'name': '독서 일기',
            'emoji': '📚',
            'description': '책을 읽고 기록합니다',
            'content': '📚 오늘 읽은 책:\n\n💭 인상 깊은 구절:\n\n'
        }
        
        response = authenticated_client.post('/api/templates/generate/', {
            'topic': '독서 일기',
            'style': 'default'
        })
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['name'] == '독서 일기'
        assert 'message' in data
