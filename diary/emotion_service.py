# diary/emotion_service.py
"""
AI 기반 감정 분석 서비스
OpenAI GPT를 사용하여 일기 내용에서 감정을 분석합니다.
"""
import json
import logging
from typing import Dict, Optional
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('diary')


class EmotionAnalyzer:
    """
    일기 내용의 감정을 분석하는 서비스
    
    지원하는 감정:
    - happy (행복)
    - sad (슬픔)
    - angry (화남)
    - anxious (불안)
    - peaceful (평온)
    - excited (신남)
    - tired (피곤)
    - love (사랑)
    """
    
    VALID_EMOTIONS = ['happy', 'sad', 'angry', 'anxious', 'peaceful', 'excited', 'tired', 'love']
    
    EMOTION_LABELS = {
        'happy': '행복',
        'sad': '슬픔',
        'angry': '화남',
        'anxious': '불안',
        'peaceful': '평온',
        'excited': '신남',
        'tired': '피곤',
        'love': '사랑',
    }
    
    def __init__(self):
        import openai
        openai.api_key = settings.OPENAI_API_KEY
        self.client = openai
    
    def analyze(self, content: str) -> Dict:
        """
        일기 내용을 분석하여 감정을 반환합니다.
        
        Args:
            content: 일기 내용 (복호화된 텍스트)
            
        Returns:
            {
                'emotion': str,       # 감정 키 (예: 'happy')
                'emotion_label': str, # 감정 라벨 (예: '행복')
                'score': int,         # 감정 강도 (0-100)
                'reason': str,        # 분석 근거
            }
        """
        if not content or len(content.strip()) < 5:
            return {
                'emotion': 'peaceful',
                'emotion_label': '평온',
                'score': 50,
                'reason': '내용이 너무 짧아 분석이 어렵습니다.',
            }
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """당신은 일기 내용을 분석하여 작성자의 감정을 파악하는 전문가입니다.
                        
다음 8가지 감정 중 하나를 선택하세요:
- happy: 행복하고 기쁜 감정
- sad: 슬프거나 우울한 감정
- angry: 화나거나 짜증나는 감정
- anxious: 불안하거나 걱정되는 감정
- peaceful: 평온하고 차분한 감정
- excited: 신나고 설레는 감정
- tired: 피곤하고 지친 감정
- love: 사랑스럽고 따뜻한 감정

반드시 다음 JSON 형식으로만 응답하세요:
{"emotion": "감정키", "score": 점수(0-100), "reason": "분석 근거 한 문장"}"""
                    },
                    {
                        "role": "user",
                        "content": f"다음 일기의 감정을 분석해주세요:\n\n{content[:1000]}"
                    }
                ],
                temperature=0.3,
                max_tokens=150,
            )
            
            result_text = response.choices[0].message.content.strip()
            logger.debug(f"Emotion analysis raw response: {result_text}")
            
            # JSON 파싱
            result = json.loads(result_text)
            
            emotion = result.get('emotion', 'peaceful')
            if emotion not in self.VALID_EMOTIONS:
                emotion = 'peaceful'
            
            score = result.get('score', 50)
            if not isinstance(score, int) or score < 0 or score > 100:
                score = 50
            
            return {
                'emotion': emotion,
                'emotion_label': self.EMOTION_LABELS.get(emotion, '평온'),
                'score': score,
                'reason': result.get('reason', ''),
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            return self._fallback_analysis(content)
        except Exception as e:
            logger.error(f"Emotion analysis failed: {e}")
            return self._fallback_analysis(content)
    
    def _fallback_analysis(self, content: str) -> Dict:
        """AI 분석 실패 시 키워드 기반 간단 분석"""
        content_lower = content.lower()
        
        # 키워드 기반 감정 추론
        emotion_keywords = {
            'happy': ['행복', '기쁘', '좋았', '웃', '즐거', '신나', '재미'],
            'sad': ['슬프', '우울', '눈물', '힘들', '아프', '그리워'],
            'angry': ['화나', '짜증', '열받', '분노', '싫'],
            'anxious': ['걱정', '불안', '두려', '무서', '떨리'],
            'peaceful': ['평화', '편안', '차분', '고요', '조용'],
            'excited': ['설레', '기대', '두근', '흥분'],
            'tired': ['피곤', '지친', '힘들', '졸', '피로'],
            'love': ['사랑', '좋아', '따뜻', '감사', '고마워'],
        }
        
        for emotion, keywords in emotion_keywords.items():
            for keyword in keywords:
                if keyword in content:
                    return {
                        'emotion': emotion,
                        'emotion_label': self.EMOTION_LABELS[emotion],
                        'score': 60,
                        'reason': f'"{keyword}" 키워드 감지',
                    }
        
        return {
            'emotion': 'peaceful',
            'emotion_label': '평온',
            'score': 50,
            'reason': '특별한 감정 키워드가 감지되지 않았습니다.',
        }


def analyze_diary_emotion(diary) -> Dict:
    """
    Diary 객체의 감정을 분석하고 저장합니다.
    
    Args:
        diary: Diary 모델 인스턴스
        
    Returns:
        분석 결과 딕셔너리
    """
    analyzer = EmotionAnalyzer()
    
    # 복호화된 내용으로 분석
    content = diary.decrypt_content()
    result = analyzer.analyze(content)
    
    # 결과를 모델에 저장
    diary.emotion = result['emotion']
    diary.emotion_score = result['score']
    diary.emotion_analyzed_at = timezone.now()
    diary.save(update_fields=['emotion', 'emotion_score', 'emotion_analyzed_at'])
    
    return result
