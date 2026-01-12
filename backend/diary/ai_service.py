# diary/ai_service.py (새 함수 추가)
import openai
import logging
from datetime import datetime
from django.conf import settings
import google.generativeai as genai
from django.conf import settings

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
        
        Args:
            diary_content (str): 일기 내용
            emotion (str, optional): 일기의 감정 (happy, sad, etc.)
            
        Returns:
            dict: { 'url': ..., 'prompt': ... }
        """
        import os
        import uuid
        import base64
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage
        
        logger.debug(f"Generating image for: {diary_content[:50]}...")
        
        if not settings.GEMINI_API_KEY:
            logger.error("Gemini API Key is not configured for Image Generation.")
            raise ValueError("API Key Configuration Error")

        try:
            # 감정에 따른 스타일 선택
            style_instruction = self.EMOTION_STYLES.get(emotion, "Artistic and emotional illustration")
            
            # AI가 생성할 이미지에 대한 프롬프트를 구성합니다.
            
            # 영어 번역이 필요할 수 있으나, 일단 단순 결합
            prompt = (
                f"An emotional illustration representing the following diary content. "
                f"Style: {style_instruction}. "
                f"Diary snippet: '{diary_content[:300]}'"
            )
            
            # Gemini 모델 (예: gemini-3-pro-image-preview) 사용 시
            if settings.GEMINI_IMAGE_MODEL.lower().startswith('gemini'):
                import google.generativeai as genai
                if settings.GEMINI_API_KEY:
                    genai.configure(api_key=settings.GEMINI_API_KEY)
                
                gen_model = genai.GenerativeModel(settings.GEMINI_IMAGE_MODEL)
                
                # Gemini 3 Image Generation Prompt
                response = gen_model.generate_content(
                    f"Draw the following: {prompt}",
                    # safety_settings? generation_config?
                )
                
                # 응답에서 이미지 추출 (Gemini 3는 parts에 info가 있음)
                # 주의: SDK 버전에 따라 다를 수 있음. 보통 response.parts[0].inline_data
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
                import requests
                
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
                        "aspectRatio": "1:1",
                        # "safetyFilterLevel": "block_some", 
                        # "personGeneration": "allow_adult"
                    }
                }
                
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                result = response.json()
                
                # 응답 구조: {'predictions': [{'bytesBase64Encoded': '...'}]}
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
            
            with open(temp_path, "wb") as f:
                f.write(image_data)
            
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
            if isinstance(e, requests.exceptions.HTTPError):
                error_msg = f"HTTP Error: {e.response.text}"
                
            logger.error(f"Gemini (Imagen) Image Generation failed: {error_msg}")
            logger.info("Falling back to OpenAI DALL-E...")
            
            if not settings.OPENAI_API_KEY:
                # Fallback 불가능 시 원본 에러 다시 발생 (혹은 새 에러)
                raise e
            
            try:
            # DALL-E Fallback (OpenAI v1.x)
            import openai
            import requests
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)


class KeywordExtractor:
    """
    KeyBERT 방식의 키워드 추출기
    - 문서를 n-gram으로 분할
    - 문서와 n-gram의 임베딩 유사도 계산
    - 가장 유사도가 높은 키워드(구) 추출
    """
    
    def __init__(self):
        try:
            from sentence_transformers import SentenceTransformer
            # ChatService와 동일한 모델 사용 (메모리 효율)
            self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        except ImportError:
            logger.warning("sentence-transformers not installed. Keyword extraction disabled.")
            self.model = None

    def extract_keywords(self, text, top_n=5, keyphrase_ngram_range=(1, 2)):
        """
        텍스트에서 핵심 키워드/구 추출
        """
        if not self.model or not text or len(text) < 10:
            return []
            
        try:
            from sklearn.feature_extraction.text import CountVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            
            # 1. n-gram 후보 생성
            count = CountVectorizer(ngram_range=keyphrase_ngram_range, stop_words=None).fit([text])
            candidates = count.get_feature_names_out()

            # 2. 문서 및 후보 임베딩
            doc_embedding = self.model.encode([text])
            candidate_embeddings = self.model.encode(candidates)

            # 3. 코사인 유사도 계산
            distances = cosine_similarity(doc_embedding, candidate_embeddings)
            
            # 4. 상위 n개 키워드 추출
            keywords = []
            for index in distances.argsort()[0][-top_n:]:
                keywords.append(candidates[index])
            
            # 유사도가 높은 순으로 정렬 (argsort는 오름차순이므로 뒤집음)
            return keywords[::-1]
            
        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}")
            return []

            
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )
            
            dall_e_url = response.data[0].url
            
            # Download DALL-E image to save locally (to keep architecture consistent)
            img_data = requests.get(dall_e_url).content
                
                filename = f"ai_images/{datetime.now().strftime('%Y/%m/%d')}/{uuid.uuid4()}.png"
                temp_path = os.path.join(settings.MEDIA_ROOT, filename)
                os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                
                with open(temp_path, "wb") as f:
                    f.write(img_data)
                
                image_url = settings.MEDIA_URL + filename
                image_url = image_url.replace('\\', '/')
                
                logger.info(f"Fallback Image generated and saved successfully: {image_url}")
                
                return {
                    'url': image_url,
                    'prompt': prompt
                }
                
            except Exception as openai_error:
                logger.error(f"OpenAI Fallback failed: {openai_error}")
                # 원본 에러와 Fallback 에러 모두 로깅되었으므로, 원본 에러를 발생시키거나
                # 사용자에게 명확한 메시지를 전달하기 위해 ValueError 발생
                raise ValueError(f"Primary (Gemini) failed: {error_msg}. Fallback (OpenAI) failed: {openai_error}")

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
            
        except Exception as e:
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
            
        except Exception as e:
            logger.error(f"OpenAI API error during transcription: {e}")
            raise e
        except Exception as e:
            logger.error(f"An unexpected error occurred during translation: {e}")
            raise e
    
    @classmethod
    def get_supported_languages(cls):
        """지원되는 주요 언어 목록을 반환합니다."""
        return cls.SUPPORTED_LANGUAGES


class DiarySummarizer:
    """
    일기 내용을 AI로 요약하는 서비스
    GPT-4o-mini를 사용하여 일기 내용을 간결하게 요약합니다.
    """
    
    def summarize(self, content: str, style: str = 'default') -> dict:
        """
        일기 내용을 요약합니다. (Gemini 1.5 Flash 사용)
        
        Args:
            content: 원본 일기 내용
            style: 요약 스타일 
                - 'default': 기본 3줄 요약
                - 'short': 1줄 요약
                - 'bullet': 핵심 포인트 불릿
        
        Returns:
            dict: {
                'summary': 요약된 내용,
                'original_length': 원본 글자 수,
                'summary_length': 요약 글자 수,
                'style': 사용된 스타일
            }
        """
        logger.debug(f"Summarizing diary content with style: {style}")
        
        if not content or len(content.strip()) < 10:
            return {
                'summary': content,
                'original_length': len(content),
                'summary_length': len(content),
                'style': style,
                'error': '요약하기에 내용이 너무 짧습니다.'
            }
        
        # 스타일별 프롬프트 설정
        style_prompts = {
            'default': """다음 일기 내용을 3줄로 간결하게 요약해주세요.
- 핵심 내용과 감정을 포함해주세요.
- 일기의 분위기를 유지해주세요.
- 요약만 반환하고 다른 설명은 하지 마세요.""",
            
            'short': """다음 일기 내용을 한 문장으로 아주 간결하게 요약해주세요.
- 가장 중요한 핵심만 포함해주세요.
- 요약만 반환하세요.""",
            
            'bullet': """다음 일기 내용의 핵심 포인트를 불릿 형식으로 정리해주세요.
- 3-5개의 핵심 포인트
- 각 포인트는 간결하게
- "• " 기호로 시작하세요."""
        }
        
        prompt_instruction = style_prompts.get(style, style_prompts['default'])
        
        if not settings.GEMINI_API_KEY:
            logger.error("Gemini API Key is not configured.")
            return {
                'summary': "API 키가 설정되지 않아 요약할 수 없습니다.",
                'original_length': len(content),
                'summary_length': 0,
                'style': style,
                'error': 'Configuration Error'
            }

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            
            response = model.generate_content([
                {'role': 'user', 'parts': [f"{prompt_instruction}\n\n일기 내용:\n{content}"]}
            ])
            
            summary = response.text.strip()
            
            logger.info(f"Diary summarized successfully. Original: {len(content)} chars, Summary: {len(summary)} chars")
            
            return {
                'summary': summary,
                'original_length': len(content),
                'summary_length': len(summary),
                'style': style
            }
            
        except Exception as e:
            logger.error(f"Gemini API error during summarization: {e}")
            # 에러 발생 시 원본 내용을 "요약 실패" 메시지와 함께 반환하거나 예외 처리
            return {
                'summary': "요약을 생성하는 중 오류가 발생했습니다.",
                'original_length': len(content),
                'summary_length': 0,
                'style': style,
                'error': str(e)
            }
    
    def suggest_title(self, content: str) -> str:
        """
        일기 내용을 기반으로 제목을 제안합니다.
        
        Args:
            content: 일기 내용
            
        Returns:
            str: 제안된 제목
        """
        logger.debug("Suggesting title for diary content")
        
        if not content or len(content.strip()) < 10:
            return "오늘의 일기"
        
        try:
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            
            prompt = f"""일기 내용을 보고 적절한 제목을 제안해주세요. 
내용: {content[:500]}
규칙: 제목만 반환하세요. 15자 이내로 작성하세요. 다른 말은 하지 마세요."""
            
            response = model.generate_content(prompt)
            title = response.text.strip()
            # 따옴표 제거
            title = title.strip('"\'')
            
            logger.info(f"Title suggested: {title}")
            return title
            
        except Exception as e:
            logger.error(f"Error suggesting title: {e}")
            return "오늘의 일기"

    def generate_report_insight(self, diaries, period_label):
        """
        Gemini를 사용하여 일기 데이터를 바탕으로 종합 감정 리포트(인사이트)를 생성합니다.
        
        Args:
            diaries (list): Diary QuerySet or list of Diary objects
            period_label (str): '일주일' or '한 달'
            
        Returns:
            str: AI Insight text
        """
        if not diaries:
            return f"이번 {period_label} 기록된 일기가 없어서 분석해드릴 내용이 없어요. 😢"

        if not settings.GEMINI_API_KEY:
            return "AI 분석 기능을 사용할 수 없습니다. (API Key Missing)"

        # 1. 일기 데이터 텍스트화
        diary_summaries = []
        for d in diaries:
            emotion = d.emotion if d.emotion else "Unknown"
            date = d.created_at.strftime("%Y-%m-%d")
            # 내용이 너무 길면 자름
            content_snippet = d.content[:200]
            diary_summaries.append(f"[{date}] (Emotion: {emotion}) {content_snippet}")
        
        prompt_context = "\n".join(diary_summaries)
        
        system_prompt = f"""
You are a professional counselor and warm-hearted listener.
Analyze the user's diary entries for the past {period_label}.
Provide a summary of their emotional flow and a helpful, empathetic piece of advice.
Write in Korean, using a gentle and polite tone (해요체).
Keep the response under 300 characters.

User's Diaries:
{prompt_context}
"""
        
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            response = model.generate_content(system_prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Generate Report Insight Error: {e}")
            return f"이번 {period_label}의 감정 흐름을 분석하는 데 문제가 발생했어요."


class TemplateGenerator:
    """
    AI를 사용하여 일기 템플릿을 생성하는 서비스.
    사용자가 주제를 입력하면 맞춤형 템플릿을 생성합니다.
    """
    
    def generate(self, topic: str, style: str = 'default') -> dict:
        """
        주제에 맞는 일기 템플릿을 생성합니다.
        
        Args:
            topic: 템플릿 주제 (예: "독서 일기", "요리 기록")
            style: 스타일 (default, simple, detailed)
            
        Returns:
            dict: {
                'name': 템플릿 이름,
                'emoji': 템플릿 아이콘,
                'description': 템플릿 설명,
                'content': 템플릿 내용
            }
        """
        logger.debug(f"Generating template for topic: {topic}, style: {style}")
        
        if not topic or len(topic.strip()) < 2:
            raise ValueError("주제를 2자 이상 입력해주세요.")
        
        style_instruction = {
            'default': '적당한 길이로 작성하세요.',
            'simple': '간단하고 짧게 작성하세요. 3-4개 항목만 포함하세요.',
            'detailed': '자세하고 구체적으로 작성하세요. 다양한 항목을 포함하세요.',
        }.get(style, '적당한 길이로 작성하세요.')
        
        try:
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            
            prompt = f"""당신은 일기 템플릿을 만드는 전문가입니다.
사용자가 원하는 주제에 맞는 일기 템플릿을 만들어주세요.

주제: {topic}
요구사항: {style_instruction}

다음 JSON 형식으로만 응답하세요:
{{
    "name": "템플릿 이름 (최대 15자)",
    "emoji": "대표 이모지 1개",
    "description": "템플릿 설명 (최대 50자)",
    "content": "템플릿 내용 (줄바꿈 포함)"
}}

템플릿 내용 규칙:
- 이모지를 활용하여 각 섹션을 구분하세요
- 사용자가 채울 부분은 빈 줄로 남겨두세요
- 항목은 질문 형식으로 작성하세요
- 한국어로 작성하세요"""

            response = model.generate_content(prompt)
            content = response.text.strip()
            
            # JSON 파싱
            import json
            # 코드 블록 제거
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            elif content.startswith('```json'): # Additional safe guard
                content = content[7:]

            content = content.strip()
            if content.endswith('```'):
                content = content[:-3].strip()
            
            result = json.loads(content)
            
            # 유효성 검사
            required_keys = ['name', 'emoji', 'description', 'content']
            for key in required_keys:
                if key not in result:
                    raise ValueError(f"Missing key: {key}")
            
            logger.info(f"Template generated: {result['name']}")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            # 폴백: 기본 템플릿 반환
            return {
                'name': topic[:15],
                'emoji': '📝',
                'description': f'{topic} 일기를 작성합니다',
                'content': f'{topic}\n\n오늘의 기록:\n\n\n느낀 점:\n\n\n내일 할 것:\n'
            }
            
        except Exception as e:
            logger.error(f"Error generating template: {e}")
            raise e
