import logging
import time
from django.conf import settings
import google.generativeai as genai
import openai
from django.core.files.base import File

logger = logging.getLogger('diary')

class STTService:
    """
    Speech-to-Text Service using OpenAI Whisper API (Legacy) or Google Gemini 3.0 Flash.
    Currently maintains Whisper API for compatibility while Gemini is configured.
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

    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
    def transcribe(self, voice_file: File, language='ko') -> str:
        """
        Transcribe audio file to text
        
        Args:
            voice_file: Django File object (from FileField)
            language: 언어 코드 (기본값: 'ko')
            
        Returns:
            Transcribed text
        """
        # 1. Try Gemini First (Cost Efficient)
        if settings.GEMINI_API_KEY and settings.GEMINI_TEXT_MODEL:
            try:
                # Need to use the file path for Gemini Upload
                if hasattr(voice_file, 'path'):
                     audio_path = voice_file.path
                else:
                    # In-memory file handling not supported by Gemini upload_file directly without saving
                     logger.warning("In-memory file passed to Gemini STT, falling back to Whisper")
                     return self._transcribe_whisper(voice_file, language)

                # Prepare Prompt
                prompt_lang = self.SUPPORTED_LANGUAGES.get(language, 'Korean')
                prompt = f"Transcribe this audio file accurately in {prompt_lang}. Output ONLY the transcription text."

                # Upload
                audio_file_ref = genai.upload_file(audio_path)
                
                # Wait
                while audio_file_ref.state.name == "PROCESSING":
                    time.sleep(1)
                    audio_file_ref = genai.get_file(audio_file_ref.name)

                if audio_file_ref.state.name == "FAILED":
                    raise ValueError("Gemini file processing failed")
                
                # Generate
                model = genai.GenerativeModel("gemini-1.5-flash") # Use Flash for speed/cost
                response = model.generate_content([prompt, audio_file_ref])
                
                return response.text.strip()

            except Exception as e:
                logger.error(f"Gemini STT failed, falling back to Whisper: {e}")
                # Fallback to Whisper
        
        return self._transcribe_whisper(voice_file, language)

    def _transcribe_whisper(self, voice_file, language):
        """Fallback to OpenAI Whisper"""
        if not settings.OPENAI_API_KEY:
            logger.error("OpenAI API Key not configured for STT Fallback")
            return None
            
        try:
             # OpenAI Whisper API 호출
            transcription_params = {
                'model': 'whisper-1',
                'file': voice_file,
            }
            if language:
                transcription_params['language'] = language
            
            # OpenAI < 1.0.0 migration style check
            if hasattr(openai, 'Audio'):
                response = openai.Audio.transcribe(**transcription_params)
                return response.text if hasattr(response, 'text') else response['text']
            else:
                 # OpenAI >= 1.0.0
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.audio.transcriptions.create(**transcription_params)
                return response.text

        except Exception as e:
            logger.error(f"Whisper STT failed: {e}")
            return None

    def translate_to_english(self, audio_file):
        """
        비영어 음성을 영어 텍스트로 번역합니다.
        """
        if not settings.OPENAI_API_KEY:
             return None
             
        try:
            if hasattr(openai, 'Audio'):
                response = openai.Audio.translate(model='whisper-1', file=audio_file)
                return response.text
            else:
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.audio.translations.create(model='whisper-1', file=audio_file)
                return response.text
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return None

    @classmethod
    def get_supported_languages(cls):
        """지원되는 주요 언어 목록을 반환합니다."""
        return cls.SUPPORTED_LANGUAGES
