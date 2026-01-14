import os
import sys
import django
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
sys.path.append(str(BASE_DIR / 'diary')) # dbg: add app dir explicitly just in case

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from diary.services.ai_service import AIService
from diary.models.diary import Diary
from django.contrib.auth.models import User
import asyncio

async def test_image_generation():
    print("🎨 AI 이미지 생성 테스트 시작...")
    
    # 임시 사용자 및 일기 생성 (없으면 생성)
    user, _ = User.objects.get_or_create(username='test_image_user')
    diary = Diary.objects.create(
        user=user,
        title="AI 이미지 테스트",
        content="푸른 초원 위에 평화롭게 누워있는 고양이",
        emotion="peaceful"
    )
    
    try:
        print(f"📝 프롬프트: {diary.content}")
        service = AIService()
        
        # 이미지 생성 호출 (동기 래퍼 사용 또는 비동기 호출)
        # AIService.generate_image_async는 비동기 함수이므로 event loop에서 실행
        image_url = await service.generate_image_async(diary.content)
        
        if image_url:
            print(f"✅ 이미지 생성 성공!")
            print(f"🔗 URL: {image_url}")
        else:
            print("❌ 이미지 생성 실패: URL이 반환되지 않음")
            
    except Exception as e:
        print(f"❌ 에러 발생: {str(e)}")
    finally:
        # 정리
        diary.delete()
        # user.delete() # 남겨두거나 삭제

if __name__ == "__main__":
    asyncio.run(test_image_generation())
