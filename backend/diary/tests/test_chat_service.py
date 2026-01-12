
"""
ChatService 테스트
"""
import pytest
from unittest.mock import patch, MagicMock
from diary.services.chat_service import ChatService
from diary.models import Diary

class TestChatService:
    @patch('diary.services.chat_service.genai')
    @patch('diary.services.chat_service.SentenceTransformer')
    def test_generate_chat_response_success(self, mock_transformer, mock_genai):
        """채팅 응답 생성 성공 케이스"""
        # Mocking Models
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "네, 그랬군요."
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        # Mock Embedding
        mock_encoder = MagicMock()
        mock_encoder.encode.return_value = [0.1] * 384
        mock_transformer.return_value = mock_encoder

        # Mock Database Search (pgvector 관련 로직은 실제 DB 대신 Mocking)
        with patch('diary.models.DiaryEmbedding.objects.annotate') as mock_search:
            mock_search.return_value.order_by.return_value = []
            
            service = ChatService()
            user = MagicMock()
            history = [{'role': 'user', 'text': '안녕'}, {'role': 'model', 'text': '반가워요'}]
            
            with patch('diary.services.chat_service.settings') as mock_settings:
                mock_settings.GEMINI_API_KEY = 'test-key'
                mock_settings.GEMINI_TEXT_MODEL = 'gemini-pro'
                
                response = service.generate_chat_response(user, "오늘 기분이 어때?", history)
                
                assert response == "네, 그랬군요."
                
                # History가 프롬프트에 포함되었는지 확인 (간접적 검증)
                args, _ = mock_model.generate_content.call_args
                prompt = args[0]
                assert "안녕" in prompt
                assert "반가워요" in prompt

    @patch('diary.services.chat_service.genai')
    def test_generate_chat_response_api_error(self, mock_genai):
        """API 에러 발생 시 예외 처리"""
        with patch('diary.services.chat_service.SentenceTransformer'):
            mock_genai.GenerativeModel.side_effect = Exception("API Error")
            
            service = ChatService()
            user = MagicMock()
            
            with patch('diary.services.chat_service.settings') as mock_settings:
                mock_settings.GEMINI_API_KEY = 'test-key'
                
                response = service.generate_chat_response(user, "테스트")
                
                assert "죄송합니다" in response
