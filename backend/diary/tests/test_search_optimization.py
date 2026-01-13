from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from diary.models import Diary
from django.utils import timezone
import datetime

User = get_user_model()

class SearchOptimizationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='searchtest',
            password='password'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create 110 diaries
        # Recent 100: "Ordinary Content"
        # Oldest 10 (index 100-109 reversed): "Target Content"
        # Since ordering is -created_at, the last created are first.
        # We want the 'Target' to be outside the top 100.
        # So we create 'Target' ones FIRST (oldest), then 100 'Ordinary' ones (newest).
        
        # 1. Create 10 Old Diaries with "Target"
        for i in range(10):
            Diary.objects.create(
                user=self.user,
                title=f'Old Target {i}',
                content='SecretTargetKeyword'
            )
            
        # 2. Create 100 New Diaries with "Ordinary"
        # We might need to ensure created_at differs if auto_now_add is fast.
        # But standard create loop usually suffices for -id/-created_at ordering.
        for i in range(100):
            Diary.objects.create(
                user=self.user,
                title=f'Recent Ordinary {i}',
                content='OrdinaryContent'
            )
            
    def test_search_limit_without_date_filter(self):
        """
        Date filter 없이 검색 시: 최근 100개만 스캔하므로
        100개 밖에 있는 'SecretTargetKeyword'는 검색되지 않아야 함 (혹은 제한된 결과만 나옴).
        """
        url = reverse('diary-list')
        response = self.client.get(url, {'content_search': 'SecretTargetKeyword'})
        
        # 최근 100개에는 'SecretTargetKeyword'가 없음.
        # 따라서 결과는 0개여야 함.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        count = len(response.data.get('results', response.data))
        self.assertEqual(count, 0, "Optimization failure: Searched beyond recent 100 without date filter")

    def test_search_with_date_filter(self):
        """
        Date filter 포함 시: 전체(혹은 범위 내) 스캔하므로
        오래된 'SecretTargetKeyword'가 검색되어야 함.
        """
        url = reverse('diary-list')
        
        # 충분히 넓은 날짜 범위 설정
        start_date = (timezone.now() - datetime.timedelta(days=365)).strftime('%Y-%m-%d')
        end_date = (timezone.now() + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = self.client.get(url, {
            'content_search': 'SecretTargetKeyword',
            'start_date': start_date,
            'end_date': end_date
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        count = len(response.data.get('results', response.data))
        # 10개 모두 찾아야 함
        self.assertEqual(count, 10, "Optimization failure: Deep search failed despite date filter")
