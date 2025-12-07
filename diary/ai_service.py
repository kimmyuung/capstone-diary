# diary/ai_service.py (새 함수 추가)
import openai
import logging
from django.conf import settings

logger = logging.getLogger('diary')

class ImageGenerator:
    def generate(self, diary_content):
        logger.debug(f"Generating image for: {diary_content[:50]}")
        # ... 코드 ...
        logger.info(f"Image generated successfully: {result['url']}")
        return result

openai.api_key = settings.OPENAI_API_KEY

def generate_diary_image(diary_content):
    """DALL-E로 일기 이미지 생성"""
    # 일기 내용에서 핵심 키워드 추출
    prompt = f"Create a peaceful, emotional illustration representing: {diary_content[:100]}"
    
    response = openai.Image.create(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1024",
        quality="standard",
        n=1,
    )
    
    return response.data[0].url
