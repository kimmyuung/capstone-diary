# diary/tests/test_models.py
"""
Diary 모델 테스트
- 모델 생성
- 암호화/복호화
- 관계
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from diary.models import Diary, DiaryImage

User = get_user_model()


class DiaryModelTest(TestCase):
    """Diary 모델 기본 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
    def test_create_diary(self):
        """일기 생성 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='테스트 일기',
            content='오늘은 좋은 하루였다.'
        )
        
        self.assertEqual(diary.title, '테스트 일기')
        self.assertEqual(diary.user, self.user)
        self.assertIsNotNone(diary.created_at)
        self.assertIsNotNone(diary.updated_at)
        
    def test_diary_str_method(self):
        """Diary __str__ 메서드 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='나의 일기',
            content='테스트 내용'
        )
        
        str_repr = str(diary)
        self.assertIn('나의 일기', str_repr)
        
    def test_diary_ordering(self):
        """일기 정렬 순서 테스트 (최신순)"""
        diary1 = Diary.objects.create(
            user=self.user,
            title='첫번째',
            content='내용'
        )
        diary2 = Diary.objects.create(
            user=self.user,
            title='두번째',
            content='내용'
        )
        
        diaries = list(Diary.objects.all())
        self.assertEqual(diaries[0].title, '두번째')  # 최신이 먼저
        self.assertEqual(diaries[1].title, '첫번째')

    def test_voice_file_field(self):
        """음성 파일 필드 테스트"""
        diary = Diary.objects.create(
            user=self.user,
            title='음성 일기',
            content='녹음 내용',
            voice_file='voice/test.m4a'
        )
        self.assertEqual(diary.voice_file, 'voice/test.m4a')



class DiaryEncryptionTest(TestCase):
    """일기 암호화 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
    @override_settings(DIARY_ENCRYPTION_KEY='')
    def test_no_encryption_when_key_not_set(self):
        """암호화 키 미설정 시 평문 저장"""
        diary = Diary(user=self.user, title='테스트')
        diary.encrypt_content('비밀 내용')
        
        # 암호화가 비활성화되면 평문 그대로
        self.assertEqual(diary.content, '비밀 내용')
        self.assertFalse(diary.is_encrypted)
        
    def test_decrypt_unencrypted_content(self):
        """암호화되지 않은 내용 복호화 시 원본 반환"""
        diary = Diary.objects.create(
            user=self.user,
            title='테스트',
            content='평문 내용',
            is_encrypted=False
        )
        
        decrypted = diary.decrypt_content()
        self.assertEqual(decrypted, '평문 내용')


class DiaryImageModelTest(TestCase):
    """DiaryImage 모델 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.diary = Diary.objects.create(
            user=self.user,
            title='이미지 테스트',
            content='내용'
        )
        
    def test_create_diary_image(self):
        """일기 이미지 생성 테스트"""
        image = DiaryImage.objects.create(
            diary=self.diary,
            image_url='https://example.com/image.png',
            ai_prompt='A beautiful sunset'
        )
        
        self.assertEqual(image.diary, self.diary)
        self.assertEqual(image.image_url, 'https://example.com/image.png')
        
    def test_diary_image_cascade_delete(self):
        """일기 삭제 시 이미지도 삭제"""
        DiaryImage.objects.create(
            diary=self.diary,
            image_url='https://example.com/image.png'
        )
        
        self.assertEqual(DiaryImage.objects.count(), 1)
        
        self.diary.delete()
        
        self.assertEqual(DiaryImage.objects.count(), 0)
        
    def test_diary_images_relationship(self):
        """일기-이미지 관계 테스트"""
        DiaryImage.objects.create(diary=self.diary, image_url='https://a.com/1.png')
        DiaryImage.objects.create(diary=self.diary, image_url='https://a.com/2.png')
        
        self.assertEqual(self.diary.images.count(), 2)
