# diary/tests/test_speech_to_text.py
"""
음성-텍스트 변환 API 테스트
- SpeechToText 서비스
- API 엔드포인트
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from unittest.mock import patch, MagicMock
from diary.ai_service import SpeechToText

User = get_user_model()


class SpeechToTextServiceTest(TestCase):
    """SpeechToText 서비스 단위 테스트"""
    
    def test_supported_languages(self):
        """지원 언어 목록 확인"""
        stt = SpeechToText()
        languages = stt.SUPPORTED_LANGUAGES
        
        self.assertIn('ko', languages)  # 한국어
        self.assertIn('en', languages)  # 영어
        self.assertIn('ja', languages)  # 일본어
        
    def test_get_supported_languages_method(self):
        """get_supported_languages 메서드 테스트"""
        stt = SpeechToText()
        result = stt.get_supported_languages()
        
        self.assertIn('languages', result)
        self.assertIn('note', result)
        self.assertIn('ko', result['languages'])
        
    @patch('diary.ai_service.openai')
    def test_transcribe_with_language(self, mock_openai):
        """언어 지정 변환 테스트"""
        # Mock 설정
        mock_response = MagicMock()
        mock_response.text = '오늘은 좋은 하루였습니다.'
        mock_openai.audio.transcriptions.create.return_value = mock_response
        
        stt = SpeechToText()
        
        # 가상의 오디오 파일 객체
        mock_audio = MagicMock()
        mock_audio.name = 'test.m4a'
        
        result = stt.transcribe(mock_audio, language='ko')
        
        self.assertEqual(result['text'], '오늘은 좋은 하루였습니다.')
        self.assertEqual(result['language'], 'ko')


class SpeechToTextAPITest(APITestCase):
    """음성 변환 API 엔드포인트 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
    def test_supported_languages_endpoint(self):
        """지원 언어 목록 API 테스트"""
        url = reverse('supported-languages')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('languages', response.data)
        
    def test_transcribe_without_audio(self):
        """오디오 없이 변환 요청 시 에러"""
        url = reverse('transcribe')
        response = self.client.post(url, {}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_transcribe_unauthenticated(self):
        """미인증 사용자 변환 요청 거부"""
        self.client.force_authenticate(user=None)
        
        url = reverse('transcribe')
        response = self.client.post(url, {}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
