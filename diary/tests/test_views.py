# diary/tests/test_views.py
"""
일기 API 뷰 테스트
- CRUD 전체 동작
- 권한 및 인증
- 에러 처리
"""
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from diary.models import Diary, DiaryImage

User = get_user_model()


class DiaryAPITest(APITestCase):
    """일기 API 기본 CRUD 테스트"""
    
    def setUp(self):
        """각 테스트 전에 실행"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        self.client.force_authenticate(user=self.user)
        
    def test_create_diary(self):
        """일기 작성 API 테스트"""
        url = reverse('diary-list')
        data = {
            'title': '오늘의 일기',
            'content': '오늘은 즐거운 하루였다.'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], data['title'])
        self.assertEqual(Diary.objects.count(), 1)
        
    def test_list_diaries(self):
        """일기 목록 조회 API 테스트"""
        # 일기 생성
        Diary.objects.create(user=self.user, title='일기1', content='내용1')
        Diary.objects.create(user=self.user, title='일기2', content='내용2')
        
        url = reverse('diary-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
    def test_retrieve_diary(self):
        """일기 상세 조회 API 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='테스트 일기',
            content='테스트 내용'
        )
        
        url = reverse('diary-detail', kwargs={'pk': diary.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], diary.title)
        
    def test_update_diary(self):
        """일기 수정 API 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='원래 제목',
            content='원래 내용'
        )
        
        url = reverse('diary-detail', kwargs={'pk': diary.pk})
        data = {
            'title': '수정된 제목',
            'content': '수정된 내용'
        }
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], '수정된 제목')
        
    def test_partial_update_diary(self):
        """일기 부분 수정 API 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='원래 제목',
            content='원래 내용'
        )
        
        url = reverse('diary-detail', kwargs={'pk': diary.pk})
        data = {'title': '제목만 수정'}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], '제목만 수정')
        # 내용은 변경되지 않아야 함
        diary.refresh_from_db()
        self.assertIn('원래', diary.decrypt_content())
        
    def test_delete_diary(self):
        """일기 삭제 API 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='삭제할 일기',
            content='삭제될 내용'
        )
        
        url = reverse('diary-detail', kwargs={'pk': diary.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Diary.objects.count(), 0)


class DiaryPermissionTest(APITestCase):
    """일기 권한 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            password='otherpass123'
        )
        
    def test_unauthenticated_access(self):
        """미인증 사용자 접근 금지 테스트"""
        url = reverse('diary-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_cannot_access_other_user_diary(self):
        """다른 사용자 일기 접근 금지 테스트"""
        # 다른 사용자의 일기 생성
        other_diary = Diary.objects.create(
            user=self.other_user,
            title='다른 사용자 일기',
            content='비밀 내용'
        )
        
        # 현재 사용자로 인증
        self.client.force_authenticate(user=self.user)
        
        # 다른 사용자 일기 접근 시도
        url = reverse('diary-detail', kwargs={'pk': other_diary.pk})
        response = self.client.get(url)
        
        # 404 반환 (본인 일기만 조회하므로)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_cannot_modify_other_user_diary(self):
        """다른 사용자 일기 수정 금지 테스트"""
        other_diary = Diary.objects.create(
            user=self.other_user,
            title='다른 사용자 일기',
            content='내용'
        )
        
        self.client.force_authenticate(user=self.user)
        
        url = reverse('diary-detail', kwargs={'pk': other_diary.pk})
        response = self.client.put(url, {'title': '해킹!', 'content': '해킹!'})
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
    def test_user_only_sees_own_diaries(self):
        """사용자는 본인 일기만 볼 수 있음"""
        # 각 사용자의 일기 생성
        Diary.objects.create(user=self.user, title='내 일기', content='내용')
        Diary.objects.create(user=self.other_user, title='남의 일기', content='내용')
        
        self.client.force_authenticate(user=self.user)
        
        url = reverse('diary-list')
        response = self.client.get(url)
        
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], '내 일기')


class DiaryValidationTest(APITestCase):
    """일기 유효성 검사 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
    def test_create_diary_without_title(self):
        """제목 없이 일기 작성 시 에러"""
        url = reverse('diary-list')
        data = {'content': '내용만'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_create_diary_with_empty_content(self):
        """빈 내용으로 일기 작성"""
        url = reverse('diary-list')
        data = {'title': '제목', 'content': ''}
        response = self.client.post(url, data, format='json')
        
        # 빈 문자열도 허용 (TextFields는 blank=True 기본값)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)