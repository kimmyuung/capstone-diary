import os
import django
from django.conf import settings
from datetime import date

# Django 설정 초기화 (최소 설정)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from diary.models import Diary, DiaryImage, UserPreference
from rest_framework.test import APIRequestFactory
from diary.views.diary_views import DiaryViewSet

User = get_user_model()
factory = APIRequestFactory()

# Disconnect signals to avoid DB lock
from django.db.models.signals import post_save
from diary.signals import create_diary_embedding, trigger_stt, auto_generate_tags
post_save.disconnect(create_diary_embedding, sender=Diary)
post_save.disconnect(trigger_stt, sender=Diary)
post_save.disconnect(auto_generate_tags, sender=Diary)

def setup_test_user(username, is_premium=False):
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_password('password')
        user.save()
    
    # 설정 초기화
    pref, _ = UserPreference.objects.get_or_create(user=user)
    pref.is_premium = is_premium
    pref.save()
    
    # 일기 생성
    diary, _ = Diary.objects.get_or_create(
        user=user,
        title="Test Diary",
        content="This is a test diary content for image generation. It needs to be long enough.",
        defaults={'emotion': 'happy'}
    )
    diary.content = "This is a sufficiently long content for testing image generation limits." * 5
    diary.save()
    
    return user, diary

def test_limit(user, diary, limit):
    print(f"\nTesting for user: {user.username} (Premium: {limit > 2})")
    
    # Reset images
    DiaryImage.objects.filter(diary__user=user).delete()
    
    # Mock request
    view = DiaryViewSet.as_view({'post': 'generate_image'})
    
    # Generate up to limit
    for i in range(limit):
        # Create dummy image records to simulate usage
        DiaryImage.objects.create(
            diary=diary,
            image_url=f"http://example.com/{i}.jpg",
            ai_prompt="test prompt"
        )
    
    print(f"Created {limit} dummy images.")
    
    # Try one more
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(f'/api/diaries/{diary.id}/generate-image/')
    
    if response.status_code == 429:
        print("PASS: Limit exceeded correctly (429)")
    else:
        print(f"FAIL: Expected 429, got {response.status_code}")
        print(response.data)

def run_verification():
    # 1. Standard User
    u1, d1 = setup_test_user('test_standard', is_premium=False)
    test_limit(u1, d1, 2)
    
    # 2. Premium User
    u2, d2 = setup_test_user('test_premium', is_premium=True)
    test_limit(u2, d2, 10)

if __name__ == '__main__':
    run_verification()
