import logging
import json
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)

# Global variable for singleton model
_SENTENCE_TRANSFORMER_MODEL = None

def get_sentence_transformer_model():
    """
    SentenceTransformer 모델을 싱글톤으로 로드하여 반환
    """
    global _SENTENCE_TRANSFORMER_MODEL
    if _SENTENCE_TRANSFORMER_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SentenceTransformer model... (This should happen once per worker)")
            _SENTENCE_TRANSFORMER_MODEL = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        except ImportError:
            logger.warning("sentence-transformers not installed. Keyword extraction disabled.")
            _SENTENCE_TRANSFORMER_MODEL = None
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer model: {e}")
            _SENTENCE_TRANSFORMER_MODEL = None
            
    return _SENTENCE_TRANSFORMER_MODEL

class KeywordExtractor:
    """
    KeyBERT 방식의 키워드 추출기 (Singleton Model 사용)
    - 문서를 n-gram으로 분할
    - 문서와 n-gram의 임베딩 유사도 계산
    - 가장 유사도가 높은 키워드(구) 추출
    """
    
    def __init__(self):
        # 생성자에서는 모델을 직접 로드하지 않고, 메서드 호출 시 get_model() 사용
        pass

    def extract_keywords(self, text, top_n=5, keyphrase_ngram_range=(1, 2)):
        """
        텍스트에서 핵심 키워드/구 추출
        """
        model = get_sentence_transformer_model()
        
        if not model or not text or len(text) < 10:
            return []
            
        try:
            from sklearn.feature_extraction.text import CountVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            
            # 1. n-gram 후보 생성
            count = CountVectorizer(ngram_range=keyphrase_ngram_range, stop_words=None).fit([text])
            candidates = count.get_feature_names_out()

            # 2. 문서 및 후보 임베딩
            doc_embedding = model.encode([text])
            candidate_embeddings = model.encode(candidates)

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


class NounExtractor:
    """
    [Option A] 정확한 단어 검색을 위한 명사 추출기.
    Kiwi 형태소 분석기를 사용하여 본문에서 명사만 추출합니다.
    (암호화된 본문을 대체할 검색 인덱스 용도)
    """
    _kiwi = None
    
    @classmethod
    def _get_kiwi(cls):
        if cls._kiwi is None:
            try:
                from kiwipiepy import Kiwi
                cls._kiwi = Kiwi(model_type='sbg') # sbg: small model (faster)
                logger.info("Loaded Kiwi morphological analyzer.")
            except ImportError:
                logger.warning("kiwipiepy not installed. Noun extraction disabled.")
                cls._kiwi = None
            except Exception as e:
                logger.error(f"Failed to load Kiwi: {e}")
                cls._kiwi = None
        return cls._kiwi

    def extract_nouns(self, text: str) -> str:
        """
        텍스트에서 명사(NNG, NNP, NR, NP)만 추출하여 공백으로 구분된 문자열 반환.
        """
        if not text:
            return ""
            
        kiwi = self._get_kiwi()
        if not kiwi:
            return ""
            
        try:
            tokens = kiwi.tokenize(text)
            nouns = []
            for token in tokens:
                # NNG: 일반명사, NNP: 고유명사, NR: 수사, NP: 대명사, SL: 알파벳, SN: 숫자
                if token.tag in ['NNG', 'NNP', 'NR', 'NP', 'SL', 'SN']:
                    nouns.append(token.form)
            
            # 중복 제거 및 공백 연결
            return ' '.join(list(set(nouns)))
            
        except Exception as e:
            logger.error(f"Noun extraction failed: {e}")
            return ""


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

    async def generate_async(self, topic: str, style: str = 'default') -> dict:
        """
        [Async] 주제에 맞는 일기 템플릿을 비동기로 생성합니다.
        (Non-blocking I/O)
        """
        logger.debug(f"Generating template (async) for topic: {topic}, style: {style}")
        
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

            # Async call to Gemini
            response = await model.generate_content_async(prompt)
            content = response.text.strip()
            
            # JSON 파싱 로직 재사용
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
            
            logger.info(f"Template generated (async): {result['name']}")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return {
                'name': topic[:15],
                'emoji': '📝',
                'description': f'{topic} 일기를 작성합니다',
                'content': f'{topic}\n\n오늘의 기록:\n\n\n느낀 점:\n\n\n내일 할 것:\n'
            }
            
        except Exception as e:
            logger.error(f"Error generating template (async): {e}")
            raise e
