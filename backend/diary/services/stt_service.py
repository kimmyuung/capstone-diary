import logging
import time
from django.conf import settings
from google import genai
from django.core.files.base import File

logger = logging.getLogger('diary')


class STTService:
    """
    Speech-to-Text Service using Google Gemini 2.5 Flash Native Audio.
    
    [무료 사용]
    - Gemini Free Tier: 15 RPM, 1,500 RPD
    - 추가 비용 없이 음성 인식 가능
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
    
    # Gemini Native Audio 모델
    AUDIO_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'

    def __init__(self):
        self.client = None
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            logger.warning("GEMINI_API_KEY not configured - STT will not work")
            
    def transcribe(self, voice_file: File, language='ko') -> str:
        """
        Transcribe audio file to text using Gemini 2.5 Native Audio
        
        Args:
            voice_file: Django File object (from FileField)
            language: 언어 코드 (기본값: 'ko')
            
        Returns:
            Transcribed text or None on error
        """
        if not self.client:
            logger.error("Gemini client not initialized - check GEMINI_API_KEY")
            return None
            
        try:
            # Get file path
            if hasattr(voice_file, 'path'):
                audio_path = voice_file.path
            elif hasattr(voice_file, 'temporary_file_path'):
                audio_path = voice_file.temporary_file_path()
            else:
                # In-memory file - save temporarily
                import tempfile
                import os
                
                ext = getattr(voice_file, 'name', 'audio.wav').split('.')[-1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}') as tmp:
                    for chunk in voice_file.chunks():
                        tmp.write(chunk)
                    audio_path = tmp.name
                    
            # Prepare Prompt
            prompt_lang = self.SUPPORTED_LANGUAGES.get(language, '한국어')
            prompt = f"이 오디오 파일을 {prompt_lang}로 정확하게 받아쓰기해주세요. 텍스트만 출력하세요."

            # Upload audio file
            logger.info(f"Uploading audio file for transcription: {audio_path}")
            audio_file_ref = self.client.files.upload(file=audio_path)
            
            # Wait for processing
            max_wait = 30  # 최대 30초 대기
            wait_time = 0
            while audio_file_ref.state.name == "PROCESSING" and wait_time < max_wait:
                time.sleep(1)
                wait_time += 1
                audio_file_ref = self.client.files.get(name=audio_file_ref.name)

            if audio_file_ref.state.name == "FAILED":
                logger.error("Gemini file processing failed")
                return None
            
            # Generate transcription using Native Audio model
            logger.info(f"Transcribing with model: {self.AUDIO_MODEL}")
            response = self.client.models.generate_content(
                model=self.AUDIO_MODEL,
                contents=[prompt, audio_file_ref]
            )
            
            result = response.text.strip() if response.text else ""
            logger.info(f"Transcription successful. Length: {len(result)} characters")
            
            return result

        except Exception as e:
            logger.error(f"Gemini STT failed: {e}")
            return None
            
    def translate_to_english(self, audio_file):
        """
        비영어 음성을 영어 텍스트로 번역합니다.
        Gemini Native Audio를 사용합니다.
        """
        if not self.client:
            return None
            
        try:
            # Get file path
            if hasattr(audio_file, 'path'):
                audio_path = audio_file.path
            else:
                import tempfile
                ext = getattr(audio_file, 'name', 'audio.wav').split('.')[-1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}') as tmp:
                    for chunk in audio_file.chunks():
                        tmp.write(chunk)
                    audio_path = tmp.name
            
            # Upload and translate
            audio_file_ref = self.client.files.upload(file=audio_path)
            
            # Wait for processing
            max_wait = 30
            wait_time = 0
            while audio_file_ref.state.name == "PROCESSING" and wait_time < max_wait:
                time.sleep(1)
                wait_time += 1
                audio_file_ref = self.client.files.get(name=audio_file_ref.name)
            
            prompt = "Transcribe and translate this audio to English. Output only the English text."
            
            response = self.client.models.generate_content(
                model=self.AUDIO_MODEL,
                contents=[prompt, audio_file_ref]
            )
            
            return response.text.strip() if response.text else None
            
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return None

    @classmethod
    def get_supported_languages(cls):
        """지원되는 주요 언어 목록을 반환합니다."""
        return cls.SUPPORTED_LANGUAGES

