# diary/ai_service.py (새 함수 추가)
import openai
import logging
from django.conf import settings

logger = logging.getLogger('diary')

class ImageGenerator:
    def generate(self, diary_content):
        """DALL-E를 사용하여 일기 내용에 맞는 이미지를 생성합니다."""
        logger.debug(f"Generating image for: {diary_content[:50]}...")
        
        try:
            # AI가 생성할 이미지에 대한 프롬프트를 구성합니다.
            prompt = (
                "An emotional and abstract illustration representing the following diary entry. "
                "The style should be peaceful, visually striking, and artistic. "
                f"Diary snippet: '{diary_content[:150]}'"
            )
            
            # OpenAI API를 호출하여 이미지를 생성합니다.
            response = openai.Image.create(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            logger.info(f"Image generated successfully: {image_url}")
            
            # 뷰에서 사용할 수 있도록 URL과 프롬프트를 딕셔너리로 반환합니다.
            return {
                'url': image_url,
                'prompt': prompt
            }
            
        except openai.error.OpenAIError as e:
            logger.error(f"OpenAI API error during image generation: {e}")
            # 에러를 다시 발생시켜 상위 호출자(뷰)에서 처리할 수 있도록 합니다.
            raise e
        except Exception as e:
            logger.error(f"An unexpected error occurred during image generation: {e}")
            raise e

class SpeechToText:
    """
    OpenAI Whisper API를 사용한 음성-텍스트 변환 서비스.
    100개 이상의 언어를 지원합니다.
    """
    
    # 지원되는 주요 언어 목록 (ISO 639-1 코드)
    SUPPORTED_LANGUAGES = {
        'ko': '한국어',
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch',
        'pt': 'Português',
        'it': 'Italiano',
        'ru': 'Русский',
        'ar': 'العربية',
        'hi': 'हिन्दी',
        'th': 'ไทย',
        'vi': 'Tiếng Việt',
    }
    
    def transcribe(self, audio_file, language='ko'):
        """
        음성 파일을 텍스트로 변환합니다.
        
        Args:
            audio_file: 오디오 파일 객체 (mp3, mp4, mpeg, mpga, m4a, wav, webm 지원)
            language: 언어 코드 (기본값: 'ko' 한국어)
                     None으로 설정하면 자동 감지
        
        Returns:
            dict: {
                'text': 변환된 텍스트,
                'language': 사용된 언어 코드
            }
        """
        logger.debug(f"Transcribing audio with language: {language}")
        
        try:
            # OpenAI Whisper API 호출
            transcription_params = {
                'model': 'whisper-1',
                'file': audio_file,
            }
            
            # 언어가 지정된 경우에만 language 파라미터 추가
            # (지정하지 않으면 Whisper가 자동 감지)
            if language:
                transcription_params['language'] = language
            
            response = openai.Audio.transcribe(**transcription_params)
            
            text = response.text if hasattr(response, 'text') else response['text']
            
            logger.info(f"Audio transcribed successfully. Length: {len(text)} characters")
            
            return {
                'text': text,
                'language': language or 'auto-detected'
            }
            
        except openai.error.OpenAIError as e:
            logger.error(f"OpenAI API error during transcription: {e}")
            raise e
        except Exception as e:
            logger.error(f"An unexpected error occurred during transcription: {e}")
            raise e
    
    def translate_to_english(self, audio_file):
        """
        비영어 음성을 영어 텍스트로 번역합니다.
        
        Args:
            audio_file: 오디오 파일 객체
        
        Returns:
            dict: {
                'text': 영어로 번역된 텍스트,
                'original_language': 원본 언어 (자동 감지)
            }
        """
        logger.debug("Translating audio to English")
        
        try:
            response = openai.Audio.translate(
                model='whisper-1',
                file=audio_file,
            )
            
            text = response.text if hasattr(response, 'text') else response['text']
            
            logger.info(f"Audio translated successfully. Length: {len(text)} characters")
            
            return {
                'text': text,
                'original_language': 'auto-detected'
            }
            
        except openai.error.OpenAIError as e:
            logger.error(f"OpenAI API error during translation: {e}")
            raise e
        except Exception as e:
            logger.error(f"An unexpected error occurred during translation: {e}")
            raise e
    
    @classmethod
    def get_supported_languages(cls):
        """지원되는 주요 언어 목록을 반환합니다."""
        return cls.SUPPORTED_LANGUAGES


openai.api_key = settings.OPENAI_API_KEY
