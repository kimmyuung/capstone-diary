# diary/tests/test_image_generation.py
from django.test import TestCase
from diary.models import Diary, DiaryImage
from diary.ai_service import generate_diary_image
from unittest.mock import patch, MagicMock

class ImageGenerationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.diary = Diary.objects.create(
            user=self.user,
            content="오늘은 바닷가에 갔다. 파도 소리가 좋았다."
        )
    
    @patch('diary.ai_service.openai.Image.create')
    def test_generate_image_from_diary(self, mock_create):
        """일기 내용으로 이미지 생성 테스트"""
        # Mock 설정
        mock_create.return_value = MagicMock(
            data=[{'url': 'https://example.com/image.png'}]
        )
        
        # 이미지 생성 (아직 구현 안 됨 - 실패할 것)
        image_url = generate_diary_image(self.diary.content)
        
        # 검증
        self.assertIsNotNone(image_url)
        self.assertTrue(image_url.startswith('https://'))
        mock_create.assert_called_once()
    
    def test_save_generated_image_to_db(self):
        """생성된 이미지 DB 저장 테스트"""
        image = DiaryImage.objects.create(
            diary=self.diary,
            image_url='https://example.com/test.png',
            ai_prompt='A peaceful beach scene'
        )
        
        self.assertEqual(image.diary, self.diary)
        self.assertIsNotNone(image.image_url)