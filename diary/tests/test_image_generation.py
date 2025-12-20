# diary/tests/test_image_generation.py
"""
AI 이미지 생성 테스트
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from unittest.mock import patch, MagicMock
from diary.models import Diary, DiaryImage
from diary.ai_service import ImageGenerator

User = get_user_model()


class ImageGeneratorServiceTest(TestCase):
    """이미지 생성 서비스 테스트"""
    
    @patch('diary.ai_service.openai.Image.create')
    def test_generate_image(self, mock_create):
        """이미지 생성 테스트"""
        mock_create.return_value = MagicMock(
            data=[MagicMock(url='https://example.com/image.png')]
        )
        
        generator = ImageGenerator()
        result = generator.generate('오늘은 바닷가에서 즐거운 시간을 보냈다.')
        
        self.assertIn('url', result)
        self.assertTrue(result['url'].startswith('https://'))
        
    @patch('diary.ai_service.openai.Image.create')
    def test_generate_image_prompt(self, mock_create):
        """이미지 생성 프롬프트 확인"""
        mock_create.return_value = MagicMock(
            data=[MagicMock(url='https://example.com/image.png')]
        )
        
        generator = ImageGenerator()
        result = generator.generate('행복한 하루')
        
        self.assertIn('prompt', result)
        mock_create.assert_called_once()


class ImageGenerationAPITest(APITestCase):
    """이미지 생성 API 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.diary = Diary.objects.create(
            user=self.user,
            title='이미지 테스트',
            content='오늘은 정말 좋은 하루였습니다.'
        )
        self.client.force_authenticate(user=self.user)
        
    @patch('diary.views.ImageGenerator')
    def test_generate_image_api(self, mock_generator_class):
        """이미지 생성 API 엔드포인트 테스트"""
        mock_generator = MagicMock()
        mock_generator.generate.return_value = {
            'url': 'https://example.com/generated.png',
            'prompt': 'A happy day'
        }
        mock_generator_class.return_value = mock_generator
        
        url = reverse('diary-generate-image', kwargs={'pk': self.diary.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('image_url', response.data)
        
    def test_generate_image_unauthenticated(self):
        """미인증 사용자 이미지 생성 거부"""
        self.client.force_authenticate(user=None)
        
        url = reverse('diary-generate-image', kwargs={'pk': self.diary.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_generate_image_other_user_diary(self):
        """다른 사용자 일기에 이미지 생성 거부"""
        other_user = User.objects.create_user(
            username='other',
            password='pass123'
        )
        other_diary = Diary.objects.create(
            user=other_user,
            title='다른 사람 일기',
            content='내용'
        )
        
        url = reverse('diary-generate-image', kwargs={'pk': other_diary.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)