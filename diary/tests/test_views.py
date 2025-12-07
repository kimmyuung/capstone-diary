# diary/tests/test_views.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class DiaryAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
    def test_create_diary_api(self):
        """일기 작성 API 테스트"""
        url = reverse('diary-list')
        data = {
            'content': '오늘은 즐거운 하루였다.',
            'raw_input': '오늘 즐거웠어'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], data['content'])
        
    def test_list_diaries_api(self):
        """일기 목록 조회 API 테스트"""
        url = reverse('diary-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)