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
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch
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
        
        if response.status_code != status.HTTP_201_CREATED:
            print(f"\nDEBUG: Response status: {response.status_code}")
            try:
                print(f"DEBUG: Response data: {response.data}")
            except:
                print(f"DEBUG: Response content: {response.content}")
        
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
        # 페이지네이션 응답 구조 확인
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 2)
        else:
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

    def test_update_diary_optimistic_locking(self):
        """일기 수정 시 낙관적 락(Optimistic Locking) 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='원본 제목',
            content='원본 내용',
            version=1
        )
        url = reverse('diary-detail', kwargs={'pk': diary.pk})
        
        # 1. 정상 업데이트 (버전 일치)
        # version=1을 보내면 성공하고 version이 2가 되어야 함
        data = {
            'title': '수정된 제목',
            'content': '수정된 내용',
            'version': 1
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        diary.refresh_from_db()
        self.assertEqual(diary.title, '수정된 제목')
        self.assertEqual(diary.version, 2)
        
        # 2. 충돌 테스트 (잘못된 버전)
        # 이미 version=2인데 version=1로 요청하면 409 Conflict
        data_conflict = {
            'title': '충돌 시도',
            'content': '충돌 내용',
            'version': 1
        }
        response_conflict = self.client.put(url, data_conflict, format='json')
        self.assertEqual(response_conflict.status_code, status.HTTP_409_CONFLICT)
        
        # DB 변경 없음 확인
        diary.refresh_from_db()
        self.assertEqual(diary.title, '수정된 제목')
        self.assertEqual(diary.version, 2)
        
        # 3. 버전 미포함 (하위 호환성 - 강제 업데이트 허용 여부에 따라 다름)
        # 현재 구현상 version이 없으면 체크 안함 -> 성공하고 버전 증가
        data_no_version = {
            'title': '강제 수정',
            'content': '강제 내용'
        }
        response_force = self.client.put(url, data_no_version, format='json')
        self.assertEqual(response_force.status_code, status.HTTP_200_OK)
        
        diary.refresh_from_db()
        self.assertEqual(diary.title, '강제 수정')
        self.assertEqual(diary.version, 3)

    def test_upload_voice_file(self):
        """음성 파일 업로드 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='음성 일기',
            content='녹음'
        )
        
        url = reverse('diary-detail', kwargs={'pk': diary.pk})
        
        # 가짜 오디오 파일 생성
        voice_content = b'fake-audio-content'
        voice_file = SimpleUploadedFile('test.m4a', voice_content, content_type='audio/m4a')
        
        # Multipart upload requires specific format in test client (usually PUT/PATCH with encode_multipart is tricky,
        # but Django test client handles it if data is dict and format is multipart)
        # However, DRF test client handles 'multipart' format automatically if passed
        data = {'voice_file': voice_file}
        response = self.client.patch(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        diary.refresh_from_db()
        self.assertTrue(bool(diary.voice_file))
        # Django appends hash to filename, so we just check if it contains the extension
        self.assertIn('.m4a', diary.voice_file.name)

    @patch('diary.services.chat_service.ChatService.generate_reflection_question')
    def test_create_diary_triggers_reflection(self, mock_reflection):
        """일기 작성 시 회고 질문 생성 트리거 테스트"""
        mock_reflection.return_value = "생성된 질문"
        
        url = reverse('diary-list')
        data = {
            'title': '회고 대상 일기',
            'content': '오늘 하루는 정말 길었다.'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reflection_question'], "생성된 질문")
        
        # DB 저장 확인
        diary = Diary.objects.get(id=response.data['id'])
        self.assertEqual(diary.reflection_question, "생성된 질문")
        mock_reflection.assert_called_once()



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
        
        # 페이지네이션 응답 구조 확인
        if 'results' in response.data:
            self.assertEqual(len(response.data['results']), 1)
            self.assertEqual(response.data['results'][0]['title'], '내 일기')
        else:
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
        
        # 빈 문자열이 허용되면 201, 아니면 400
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])