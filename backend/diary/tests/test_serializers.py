# diary/tests/test_serializers.py
"""
Serializer 테스트
- 암호화/복호화 자동 처리
- 데이터 변환
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from diary.models import Diary, DiaryImage
from diary.serializers import DiarySerializer, DiaryImageSerializer

User = get_user_model()


class DiarySerializerTest(TestCase):
    """DiarySerializer 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
    def test_serializer_create(self):
        """Serializer로 일기 생성"""
        data = {
            'title': '테스트 제목',
            'content': '테스트 내용입니다.'
        }
        
        serializer = DiarySerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        diary = serializer.save(user=self.user)
        
        self.assertEqual(diary.title, '테스트 제목')
        
    def test_serializer_update(self):
        """Serializer로 일기 수정"""
        diary = Diary.objects.create(
            user=self.user,
            title='원래 제목',
            content='원래 내용'
        )
        
        data = {
            'title': '수정된 제목',
            'content': '수정된 내용'
        }
        
        serializer = DiarySerializer(diary, data=data)
        self.assertTrue(serializer.is_valid())
        
        updated = serializer.save()
        self.assertEqual(updated.title, '수정된 제목')
        
    def test_serializer_includes_images(self):
        """Serializer에 이미지 포함"""
        diary = Diary.objects.create(
            user=self.user,
            title='이미지 테스트',
            content='내용'
        )
        DiaryImage.objects.create(
            diary=diary,
            image_url='https://example.com/img.png'
        )
        
        serializer = DiarySerializer(diary)
        data = serializer.data
        
        self.assertIn('images', data)
        self.assertEqual(len(data['images']), 1)
        
    def test_serializer_read_only_fields(self):
        """읽기 전용 필드 테스트"""
        data = {
            'title': '테스트',
            'content': '내용',
            'user': 999,  # 임의의 user ID (무시되어야 함)
        }
        
        serializer = DiarySerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        diary = serializer.save(user=self.user)
        self.assertEqual(diary.user, self.user)  # 입력된 user 무시


class DiaryImageSerializerTest(TestCase):
    """DiaryImageSerializer 테스트"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.diary = Diary.objects.create(
            user=self.user,
            title='테스트',
            content='내용'
        )
        
    def test_image_serializer(self):
        """이미지 Serializer 테스트"""
        image = DiaryImage.objects.create(
            diary=self.diary,
            image_url='https://example.com/test.png',
            ai_prompt='A beautiful scene'
        )
        
        serializer = DiaryImageSerializer(image)
        data = serializer.data
        
        self.assertEqual(data['image_url'], 'https://example.com/test.png')
        self.assertEqual(data['ai_prompt'], 'A beautiful scene')
        self.assertIn('created_at', data)
