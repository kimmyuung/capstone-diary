import os
import sys
import django
from pathlib import Path
import asyncio

print("DEBUG: Starting script...", flush=True)

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
print("DEBUG: Calling django.setup()...", flush=True)
django.setup()
print("DEBUG: django.setup() done.", flush=True)

from diary.services.image_service import ImageGenerator
from diary.models.diary import Diary
from django.contrib.auth.models import User

def test_image_generation():
    print("🎨 AI 이미지 생성 테스트 시작...", flush=True)
    
    # 임시 사용자 및 일기 생성 (없으면 생성)
    user, _ = User.objects.get_or_create(username='test_image_user_sync')
    diary = Diary.objects.create(
        user=user,
        title="AI 이미지 테스트",
        content="A cute cat sleeping on a cloud in a dreamlike sky",
        emotion="dreamy"
    )
    
    try:
        print(f"📝 프롬프트: {diary.content}")
        service = ImageGenerator()
        
        # 이미지 생성 호출 (동기)
        result = service.generate(diary.content, emotion=diary.emotion)
        
        if result and 'url' in result:
            print(f"✅ 이미지 생성 성공!")
            print(f"🔗 URL: {result['url']}")
            print(f"📄 프롬프트: {result.get('prompt')}")
        else:
            print("❌ 이미지 생성 실패: 결과가 없거나 URL이 없습니다.")
            
    except Exception as e:
        print(f"❌ 에러 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # 정리
        diary.delete()
        # user.delete() 

if __name__ == "__main__":
    test_image_generation()
