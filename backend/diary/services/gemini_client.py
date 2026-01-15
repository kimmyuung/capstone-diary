"""
Gemini API Client - 통합 클라이언트

모든 Gemini API 호출을 통합하여 관리합니다.
- 텍스트 생성 (감정 분석, 요약, 템플릿)
- 이미지 생성
- 재시도 정책 적용
"""
import logging
from typing import Optional, Any
from functools import lru_cache
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiClientError(Exception):
    """Gemini API 호출 실패 시 발생하는 예외"""
    pass


class GeminiClient:
    """
    Gemini API 통합 클라이언트
    
    Usage:
        client = get_gemini_client()
        response = client.generate_text("프롬프트")
    """
    
    def __init__(self, text_model: str = None, image_model: str = None):
        self.text_model = text_model or getattr(settings, 'GEMINI_TEXT_MODEL', 'gemini-1.5-flash')
        self.image_model = image_model or getattr(settings, 'GEMINI_IMAGE_MODEL', 'imagen-3.0-generate-001')
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of Gemini client"""
        if self._client is None:
            try:
                from google import genai
                api_key = getattr(settings, 'GEMINI_API_KEY', '')
                if not api_key:
                    raise GeminiClientError("GEMINI_API_KEY is not configured")
                self._client = genai.Client(api_key=api_key)
            except ImportError:
                raise GeminiClientError("google-genai package is not installed")
        return self._client
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True
    )
    def generate_text(
        self, 
        prompt: str, 
        system_instruction: str = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """
        텍스트 생성 (감정 분석, 요약, 템플릿 등)
        
        Args:
            prompt: 사용자 프롬프트
            system_instruction: 시스템 지시사항
            temperature: 창의성 정도 (0.0 ~ 1.0)
            max_tokens: 최대 토큰 수
            
        Returns:
            생성된 텍스트
        """
        try:
            config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
            
            contents = prompt
            if system_instruction:
                contents = f"{system_instruction}\n\n{prompt}"
            
            response = self.client.models.generate_content(
                model=self.text_model,
                contents=contents,
                config=config
            )
            
            if response and response.text:
                return response.text.strip()
            
            raise GeminiClientError("Empty response from Gemini API")
            
        except Exception as e:
            logger.error(f"[GeminiClient] Text generation failed: {e}")
            raise GeminiClientError(f"Text generation failed: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=2, min=3, max=15),
        reraise=True
    )
    def generate_image(
        self, 
        prompt: str,
        aspect_ratio: str = "1:1",
        safety_filter: str = "block_only_high"
    ) -> Optional[bytes]:
        """
        이미지 생성
        
        Args:
            prompt: 이미지 설명 프롬프트
            aspect_ratio: 이미지 비율 ("1:1", "16:9", "9:16", "4:3", "3:4")
            safety_filter: 안전 필터 수준
            
        Returns:
            생성된 이미지 바이트 데이터 또는 None
        """
        try:
            response = self.client.models.generate_images(
                model=self.image_model,
                prompt=prompt,
                config={
                    "number_of_images": 1,
                    "aspect_ratio": aspect_ratio,
                    "safety_filter_level": safety_filter,
                }
            )
            
            if response.generated_images and len(response.generated_images) > 0:
                return response.generated_images[0].image.image_bytes
            
            logger.warning("[GeminiClient] No images generated")
            return None
            
        except Exception as e:
            logger.error(f"[GeminiClient] Image generation failed: {e}")
            raise GeminiClientError(f"Image generation failed: {str(e)}")
    
    def analyze_emotion(self, text: str) -> dict:
        """
        텍스트에서 감정 분석
        
        Returns:
            {"emotion": "happy", "score": 85, "label": "행복"}
        """
        system_instruction = """
        당신은 감정 분석 전문가입니다. 주어진 텍스트에서 주요 감정을 분석하세요.
        반드시 다음 JSON 형식으로만 응답하세요:
        {"emotion": "감정영어명", "score": 0-100, "label": "감정한글명"}
        
        감정 종류: happy(행복), sad(슬픔), angry(화남), anxious(불안), calm(평온), excited(신남), tired(피곤), love(사랑)
        """
        
        try:
            response = self.generate_text(
                prompt=f"다음 텍스트의 감정을 분석하세요:\n\n{text}",
                system_instruction=system_instruction,
                temperature=0.3
            )
            
            import json
            # JSON 파싱 시도
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(response[start:end])
            
            return {"emotion": "calm", "score": 50, "label": "평온"}
            
        except Exception as e:
            logger.error(f"[GeminiClient] Emotion analysis failed: {e}")
            return {"emotion": "calm", "score": 50, "label": "평온"}


@lru_cache(maxsize=1)
def get_gemini_client() -> GeminiClient:
    """
    Gemini 클라이언트 싱글톤 인스턴스 반환
    """
    return GeminiClient()
