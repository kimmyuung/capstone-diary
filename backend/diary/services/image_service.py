import logging
import base64
import uuid
import os
import requests
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
import google.generativeai as genai

# 순환 참조 방지를 위해 모델은 메서드 내부에서 import 하거나 필요시 import

logger = logging.getLogger('diary')

class ImageGenerator:
    # 감정별 스타일 매핑
    EMOTION_STYLES = {
        'happy': 'Vibrant colors, bright lighting, Impressionist style, cheerful atmosphere',
        'sad': 'Muted colors, watercolor style, rainy or foggy atmosphere, minimalist',
        'angry': 'Intense colors, bold brush strokes, Abstract Expressionism, dynamic composition',
        'anxious': 'Surrealist style, dreamlike, slightly distorted, soft edges',
        'peaceful': 'Pastel colors, soft lighting, realistic landscape, serene atmosphere',
        'excited': 'Vivid colors, Pop Art style, dynamic energy, high contrast',
        'tired': 'Low saturation, soft focus, cozy atmosphere, warm lighting',
        'love': 'Warm colors, romantic atmosphere, soft glow, detailed',
    }

    def generate(self, diary_content, emotion=None):
        """
        Gemini Imagen 3를 사용하여 일기 내용에 맞는 이미지를 생성합니다.
        
        [최적화 전략]
        1. 키워드 기반 프롬프트 생성 (Prompt Normalization)
           - 원문 대신 핵심 키워드를 사용하여 재사용성을 높임
        2. 캐싱 (Caching)
           - 동일한 프롬프트로 생성된 이미지가 있다면 API 호출 없이 URL 재사용
        """
        
        logger.debug(f"Generating image for: {diary_content[:50]}...")
        
        if not settings.GEMINI_API_KEY:
            logger.error("Gemini API Key is not configured for Image Generation.")
            raise ValueError("API Key Configuration Error")

        # 1. 프롬프트 구성 (키워드 추출 시도)
        try:
            from .analysis_service import KeywordExtractor
            extractor = KeywordExtractor()
            keywords = extractor.extract_keywords(diary_content, top_n=5)
            
            if keywords:
                # 키워드 기반 프롬프트 (재사용성 높음)
                # 예: "Keywords: 학교, 친구, 점심. Style: Happy..."
                content_desc = f"Keywords: {', '.join(keywords)}"
            else:
                # 키워드 없음 -> 원문 Snippet (Fallback)
                content_desc = f"Snippet: '{diary_content[:300]}'"
                
        except Exception as e:
            logger.warning(f"Keyword extraction failed for image prompt: {e}")
            content_desc = f"Snippet: '{diary_content[:300]}'"

        style_instruction = self.EMOTION_STYLES.get(emotion, "Artistic and emotional illustration")
        
        # 최종 프롬프트 (DB 검색 및 API 요청용)
        prompt = (
            f"An emotional illustration representing the following context. "
            f"{content_desc}. "
            f"Style: {style_instruction}. "
            f"Atmosphere: {emotion or 'Neutral'}."
        )

        try:
            # 2. 캐시 확인 (DB에서 동일 프롬프트 검색)
            from ..models import DiaryImage
            
            cached_image = DiaryImage.objects.filter(ai_prompt=prompt).first()
            if cached_image:
                logger.info(f"Image Cache Hit! Reusing URL for prompt: {prompt[:50]}...")
                return {
                    'url': cached_image.image_url,
                    'prompt': prompt
                }
            
            # Cache Miss: API 호출 진행
            logger.info("Image Cache Miss. Calling AI API...")
            
            # Gemini 모델 (예: gemini-3-pro-image-preview) 사용 시
            if settings.GEMINI_IMAGE_MODEL.lower().startswith('gemini'):
                genai.configure(api_key=settings.GEMINI_API_KEY)
                
                gen_model = genai.GenerativeModel(settings.GEMINI_IMAGE_MODEL)
                
                # Gemini 3 Image Generation Prompt
                response = gen_model.generate_content(
                    f"Draw the following: {prompt}",
                )
                
                # 응답에서 이미지 추출
                if not response.parts:
                     raise ValueError("No content generated")
                
                image_data = None
                for part in response.parts:
                    if part.inline_data:
                        image_data = part.inline_data.data # bytes
                        break
                
                if not image_data:
                    raise ValueError("No image data found in Gemini response")

            else:
                # 기존 Imagen REST API 호출 (imagen-*)
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_IMAGE_MODEL}:predict?key={settings.GEMINI_API_KEY}"
                
                headers = {
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "instances": [
                        {
                            "prompt": prompt
                        }
                    ],
                    "parameters": {
                        "sampleCount": 1,
                        "aspectRatio": "1:1"
                    }
                }
                
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                result = response.json()
                
                if 'predictions' not in result or not result['predictions']:
                    logger.error(f"Imagen API Error: {result}")
                    raise ValueError("No images generated by Gemini (Imagen).")
                    
                b64_image = result['predictions'][0]['bytesBase64Encoded']
                image_data = base64.b64decode(b64_image)
            
            # 공통: 이미지 로컬 저장
            filename = f"ai_images/{datetime.now().strftime('%Y/%m/%d')}/{uuid.uuid4()}.png"
            
            # 임시 파일 경로
            temp_path = os.path.join(settings.MEDIA_ROOT, filename)
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            
            # [Optimization] 이미지 압축 및 리사이징
            try:
                from PIL import Image
                import io
                
                img = Image.open(io.BytesIO(image_data))
                
                # 1. 리사이징 (최대 1024px)
                max_size = (1024, 1024)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # 2. 포맷 변환 및 압축 (WebP가 효율적이나 호환성 위해 JPEG/PNG 유지하되 최적화)
                # 여기서는 용량 절감을 위해 WebP로 변환하거나 JPEG 품질 조절
                # 사용자가 "압축"을 요청했으므로 JPEG Quality 85로 저장 (또는 PNG 최적화)
                
                # 투명도(RGBA)가 섞여있을 수 있으므로 처리
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new(img.mode[:-1], img.size, (255, 255, 255))
                    background.paste(img, img.split()[-1])
                    img = background
                
                img = img.convert('RGB')
                
                # 원래 확장자 유지 (.png) 하되 저장은 JPEG 형식으로 압축 (용량 대폭 감소)
                # 파일 확장자를 .jpg로 변경하는 것이 좋으나, 
                # 위에서 이미 filename을 uuid.png로 생성했으므로 .jpg로 변경
                filename = filename.replace('.png', '.jpg')
                temp_path = temp_path.replace('.png', '.jpg')
                image_url_ext = '.jpg'
                
                img.save(temp_path, 'JPEG', quality=85, optimize=True)
                logger.info(f"Image compressed and saved: {temp_path}")
                
            except Exception as compress_err:
                logger.warning(f"Image compression failed, saving original: {compress_err}")
                with open(temp_path, "wb") as f:
                    f.write(image_data)
                image_url_ext = '.png'
            
            # URL 생성
            image_url = settings.MEDIA_URL + filename

            image_url = image_url.replace('\\', '/')
            
            logger.info(f"Image generated and saved successfully: {image_url}")
            
            return {
                'url': image_url,
                'prompt': prompt
            }
            
        except Exception as e:
            # 통합된 에러 처리 및 Fallback 로직
            error_msg = str(e)
            if 'requests' in locals() and isinstance(e, requests.exceptions.HTTPError):
                error_msg = f"HTTP Error: {e.response.text}"
                
            logger.error(f"Gemini (Imagen) Image Generation failed: {error_msg}")
            logger.info("Falling back to OpenAI DALL-E...")
            
            if not settings.OPENAI_API_KEY:
                # Fallback 불가능 시 원본 에러 다시 발생 (혹은 새 에러)
                raise e
            
            try:
                # DALL-E Fallback (OpenAI v1.x)
                import openai
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                
                response = client.images.generate(
                    model="dall-e-3",
                    prompt=prompt or diary_content[:500],
                    size="1024x1024",
                    quality="standard",
                    n=1,
                )
                
                image_url = response.data[0].url
                return {
                    'url': image_url,
                    'prompt': prompt
                }
            except Exception as e2:
                logger.error(f"DALL-E Fallback failed: {e2}")
                raise e
