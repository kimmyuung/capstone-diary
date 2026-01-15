import logging
import json
from google import genai
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
    
    from ..utils.retry_utils import ai_retry_policy

    @ai_retry_policy
    def _call_gemini(self, client, model, prompt):
        """Gemini API 호출 (재시도 적용)"""
        return client.models.generate_content(
            model=model,
            contents=prompt
        )

    
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
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
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

            # API 호출 (Retry 적용)
            response = self._call_gemini(client, settings.GEMINI_TEXT_MODEL, prompt)
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
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
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

            # Async call (Retry 적용)
            response = self._call_gemini(client, settings.GEMINI_TEXT_MODEL, prompt)
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


class EmotionTrendAnalyzer:
    """
    감정 트렌드 분석기
    - 연속 부정적 감정 감지
    - 주간 감정 트렌드 분석
    - 맞춤 격려 메시지 생성
    """
    
    NEGATIVE_EMOTIONS = {'sad', 'angry', 'anxious', 'tired'}
    POSITIVE_EMOTIONS = {'happy', 'peaceful', 'excited', 'love'}
    
    ENCOURAGEMENT_MESSAGES = {
        'sad': [
            "힘든 시간을 보내고 계시네요. 괜찮아요, 이 또한 지나갈 거예요. 🌈",
            "슬픔을 느끼는 것도 자연스러운 감정이에요. 스스로를 돌보는 시간을 가져보세요. 💙",
        ],
        'angry': [
            "화가 나는 감정이 계속되고 있네요. 깊게 숨을 쉬어보세요. 🌿",
            "분노 뒤에 숨겨진 진짜 감정을 찾아보면 어떨까요? 💭",
        ],
        'anxious': [
            "불안한 나날이 이어지고 있군요. 오늘 하루 작은 것에 집중해보세요. ☁️",
            "불안함을 느끼는 건 변화를 원한다는 신호일 수도 있어요. 🌱",
        ],
        'tired': [
            "피곤함이 쌓이고 있네요. 충분한 휴식을 취하셨나요? 😴",
            "지친 마음에게 쉬어갈 시간을 주세요. 작은 산책도 도움이 될 거예요. 🚶",
        ],
    }
    
    @classmethod
    def analyze_recent_trend(cls, user, days: int = 7) -> dict:
        """
        최근 N일간의 감정 트렌드 분석
        
        Returns:
            {
                'consecutive_negative': int,  # 연속 부정적 감정 일수
                'needs_alert': bool,          # 알림 필요 여부 (3일 이상 연속)
                'dominant_negative': str,     # 가장 많이 기록된 부정 감정
                'message': str,               # 격려 메시지 (알림 필요시)
                'positive_ratio': float,      # 긍정 감정 비율
                'total_entries': int,         # 총 일기 수
            }
        """
        from datetime import date, timedelta
        from ..models import Diary
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        diaries = Diary.objects.filter(
            user=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            emotion__isnull=False
        ).order_by('-created_at')
        
        if not diaries.exists():
            return {
                'consecutive_negative': 0,
                'needs_alert': False,
                'dominant_negative': None,
                'message': None,
                'positive_ratio': 0.0,
                'total_entries': 0,
            }
        
        emotions = [d.emotion for d in diaries]
        total_entries = len(emotions)
        
        # 연속 부정적 감정 계산
        consecutive_negative = 0
        for emotion in emotions:
            if emotion in cls.NEGATIVE_EMOTIONS:
                consecutive_negative += 1
            else:
                break  # 연속이 끊기면 중단
        
        # 우세 부정 감정 계산
        negative_counts = {}
        positive_count = 0
        for emotion in emotions:
            if emotion in cls.NEGATIVE_EMOTIONS:
                negative_counts[emotion] = negative_counts.get(emotion, 0) + 1
            elif emotion in cls.POSITIVE_EMOTIONS:
                positive_count += 1
        
        dominant_negative = max(negative_counts, key=negative_counts.get) if negative_counts else None
        positive_ratio = positive_count / total_entries if total_entries > 0 else 0.0
        
        # 알림 필요 여부 (3일 연속 부정 감정)
        needs_alert = consecutive_negative >= 3
        
        # 격려 메시지 선택
        message = None
        if needs_alert and dominant_negative:
            import random
            messages = cls.ENCOURAGEMENT_MESSAGES.get(dominant_negative, [])
            if messages:
                message = random.choice(messages)
        
        return {
            'consecutive_negative': consecutive_negative,
            'needs_alert': needs_alert,
            'dominant_negative': dominant_negative,
            'message': message,
            'positive_ratio': round(positive_ratio, 2),
            'total_entries': total_entries,
        }
    
    @classmethod
    def get_weekly_summary(cls, user) -> dict:
        """
        주간 감정 요약 (시간대별/요일별 통계 포함)
        """
        from datetime import date, timedelta
        from collections import defaultdict
        from ..models import Diary
        
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        diaries = Diary.objects.filter(
            user=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        # 요일별 감정 분포
        weekday_emotions = defaultdict(list)
        # 시간대별 감정 분포 (0-6: 새벽, 6-12: 아침, 12-18: 오후, 18-24: 저녁)
        hour_emotions = defaultdict(list)
        
        WEEKDAY_NAMES = ['월', '화', '수', '목', '금', '토', '일']
        HOUR_RANGES = {
            (0, 6): '새벽',
            (6, 12): '아침',
            (12, 18): '오후',
            (18, 24): '저녁',
        }
        
        for diary in diaries:
            if diary.emotion:
                weekday = diary.created_at.weekday()
                weekday_emotions[WEEKDAY_NAMES[weekday]].append(diary.emotion)
                
                hour = diary.created_at.hour
                for (start, end), name in HOUR_RANGES.items():
                    if start <= hour < end:
                        hour_emotions[name].append(diary.emotion)
                        break
        
        # 각 그룹별 우세 감정 계산
        def get_dominant(emotions_list):
            if not emotions_list:
                return None
            from collections import Counter
            return Counter(emotions_list).most_common(1)[0][0]
        
        return {
            'weekday_patterns': {day: get_dominant(emotions) for day, emotions in weekday_emotions.items()},
            'hourly_patterns': {period: get_dominant(emotions) for period, emotions in hour_emotions.items()},
            'total_diaries': diaries.count(),
        }
