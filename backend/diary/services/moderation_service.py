"""
콘텐츠 모더레이션 서비스
AI를 활용한 유해 콘텐츠 자동 감지
"""
import re
from typing import Dict, List, Optional
from google import genai
from django.conf import settings
from ..models.moderation import FlaggedContent


class ContentModerationService:
    """
    AI 기반 콘텐츠 모더레이션 서비스
    Gemini API를 사용하여 유해 콘텐츠를 감지합니다.
    """
    
    # 감지 임계값 (0.0 ~ 1.0)
    CONFIDENCE_THRESHOLD = 0.7
    
    # 유해 키워드 패턴 (정규식)
    HARMFUL_PATTERNS = {
        'violence': [
            r'살해', r'폭행', r'구타', r'때리', r'죽이',
            r'칼', r'총', r'무기', r'피', r'상해'
        ],
        'self_harm': [
            r'자살', r'자해', r'목숨', r'죽고\s*싶', r'끝내고\s*싶',
            r'손목', r'투신', r'번개탄'
        ],
        'hate_speech': [
            r'혐오', r'차별', r'비하', r'멸시'
        ],
        'illegal': [
            r'마약', r'대마', r'필로폰', r'코카인', r'헤로인',
            r'불법', r'밀매', r'밀수', r'사기'
        ],
    }
    
    def __init__(self):
        """Gemini 클라이언트 초기화"""
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = getattr(settings, 'GEMINI_TEXT_MODEL', 'gemini-2.0-flash-exp')
    
    def analyze_content(self, content: str) -> Dict:
        """
        콘텐츠 분석 및 유해성 판단
        
        Args:
            content: 분석할 텍스트 내용
            
        Returns:
            {
                'is_harmful': bool,
                'flags': [
                    {
                        'type': str,
                        'confidence': float,
                        'keywords': [str]
                    }
                ]
            }
        """
        if not content or not content.strip():
            return {'is_harmful': False, 'flags': []}
        
        # 1단계: 키워드 기반 빠른 검사
        keyword_flags = self._check_keywords(content)
        
        # 2단계: AI 기반 상세 분석 (키워드 감지 시에만)
        ai_flags = []
        if keyword_flags:
            ai_flags = self._analyze_with_ai(content)
        
        # 결과 통합
        all_flags = self._merge_flags(keyword_flags, ai_flags)
        is_harmful = any(flag['confidence'] >= self.CONFIDENCE_THRESHOLD for flag in all_flags)
        
        return {
            'is_harmful': is_harmful,
            'flags': all_flags
        }
    
    def _check_keywords(self, content: str) -> List[Dict]:
        """키워드 패턴 매칭으로 빠른 검사"""
        flags = []
        
        for flag_type, patterns in self.HARMFUL_PATTERNS.items():
            matched_keywords = []
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    matched_keywords.append(pattern)
            
            if matched_keywords:
                # 키워드 매칭은 중간 신뢰도로 설정
                confidence = min(0.6 + len(matched_keywords) * 0.1, 0.9)
                flags.append({
                    'type': flag_type,
                    'confidence': confidence,
                    'keywords': matched_keywords,
                    'source': 'keyword'
                })
        
        return flags
    
    def _analyze_with_ai(self, content: str) -> List[Dict]:
        """Gemini AI로 상세 분석"""
        try:
            prompt = f"""다음 일기 내용을 분석하여 유해성을 판단해주세요.

일기 내용:
{content}

다음 카테고리별로 유해성을 0.0~1.0 점수로 평가하고, JSON 형식으로 응답해주세요:
- violence (폭력)
- hate_speech (혐오 발언)
- self_harm (자해)
- illegal (불법 활동)
- harassment (괴롭힘)
- sexual (성적 콘텐츠)

응답 형식:
{{
    "violence": 0.0,
    "hate_speech": 0.0,
    "self_harm": 0.0,
    "illegal": 0.0,
    "harassment": 0.0,
    "sexual": 0.0
}}

점수가 0.7 이상이면 유해한 것으로 간주합니다.
일기의 맥락을 고려하여 판단해주세요. 단순히 감정 표현이나 일상적인 내용은 유해하지 않습니다."""

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            
            # JSON 파싱
            import json
            result_text = response.text.strip()
            
            # JSON 블록 추출 (```json ... ``` 형식 처리)
            if '```json' in result_text:
                result_text = result_text.split('```json')[1].split('```')[0].strip()
            elif '```' in result_text:
                result_text = result_text.split('```')[1].split('```')[0].strip()
            
            scores = json.loads(result_text)
            
            # 점수를 플래그로 변환
            flags = []
            for flag_type, confidence in scores.items():
                if confidence > 0.3:  # 낮은 임계값으로 모든 가능성 기록
                    flags.append({
                        'type': flag_type,
                        'confidence': float(confidence),
                        'keywords': [],
                        'source': 'ai'
                    })
            
            return flags
            
        except Exception as e:
            # AI 분석 실패 시 로그만 남기고 빈 결과 반환
            print(f"AI moderation failed: {e}")
            return []
    
    def _merge_flags(self, keyword_flags: List[Dict], ai_flags: List[Dict]) -> List[Dict]:
        """키워드 플래그와 AI 플래그 통합"""
        merged = {}
        
        # 키워드 플래그 추가
        for flag in keyword_flags:
            flag_type = flag['type']
            merged[flag_type] = flag
        
        # AI 플래그와 병합 (더 높은 신뢰도 사용)
        for flag in ai_flags:
            flag_type = flag['type']
            if flag_type in merged:
                # 두 소스의 신뢰도를 가중 평균
                keyword_conf = merged[flag_type]['confidence']
                ai_conf = flag['confidence']
                merged[flag_type]['confidence'] = (keyword_conf * 0.4 + ai_conf * 0.6)
                merged[flag_type]['source'] = 'both'
            else:
                merged[flag_type] = flag
        
        return list(merged.values())
    
    def create_flag_records(self, diary, analysis_result: Dict) -> List[FlaggedContent]:
        """
        분석 결과를 DB에 저장
        
        Args:
            diary: Diary 모델 인스턴스
            analysis_result: analyze_content() 결과
            
        Returns:
            생성된 FlaggedContent 객체 리스트
        """
        if not analysis_result['is_harmful']:
            return []
        
        created_flags = []
        for flag in analysis_result['flags']:
            if flag['confidence'] >= self.CONFIDENCE_THRESHOLD:
                flagged = FlaggedContent.objects.create(
                    diary=diary,
                    flag_type=flag['type'],
                    confidence=flag['confidence'],
                    detected_keywords=flag.get('keywords', [])
                )
                created_flags.append(flagged)
        
        return created_flags
