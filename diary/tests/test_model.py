# diary/tests/test_models.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from diary.models import Diary, Emotion

User = get_user_model()

class DiaryModelTest(TestCase):
    def setUp(self):
        """각 테스트 전에 실행"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
    def test_create_diary(self):
        """일기 생성 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            content="오늘은 좋은 하루였다.",
            raw_input="오늘 좋았어"
        )
        self.assertEqual(diary.content, "오늘은 좋은 하루였다.")
        self.assertEqual(diary.user, self.user)
        
    def test_diary_str_method(self):
        """Diary __str__ 메서드 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            content="테스트 일기"
        )
        expected = f"{self.user.username} - {diary.created_at.date()}"
        self.assertEqual(str(diary), expected)