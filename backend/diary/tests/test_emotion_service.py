# diary/tests/test_emotion_service.py
"""
감정 분석 서비스 테스트
- EmotionAnalyzer
- analyze_diary_emotion
"""
import sys
import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone


@pytest.fixture
def mock_openai():
    """OpenAI 모듈 모킹"""
    mock = MagicMock()
    return mock


@pytest.fixture
def mock_settings():
    """settings 모킹"""
    mock = MagicMock()
    mock.OPENAI_API_KEY = 'test-key'
    return mock


class TestEmotionAnalyzer:
    """감정 분석기 테스트"""
    
    def test_analyze_happy_emotion(self, mock_openai, mock_settings):
        """행복한 감정 분석 테스트"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                mock_response = MagicMock()
                mock_response.choices = [MagicMock(message=MagicMock(
                    content='{"emotion": "happy", "score": 85, "reason": "긍정적인 표현이 많습니다."}'
                ))]
                mock_openai.chat.completions.create.return_value = mock_response
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("오늘은 정말 행복한 하루였다! 친구들과 즐거운 시간을 보냈다.")
                
                assert result['emotion'] == 'happy'
                assert result['emotion_label'] == '행복'
                assert result['score'] == 85
                assert 'reason' in result
    
    def test_analyze_sad_emotion(self, mock_openai, mock_settings):
        """슬픈 감정 분석 테스트"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                mock_response = MagicMock()
                mock_response.choices = [MagicMock(message=MagicMock(
                    content='{"emotion": "sad", "score": 70, "reason": "슬픔을 표현하는 단어가 있습니다."}'
                ))]
                mock_openai.chat.completions.create.return_value = mock_response
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("오늘은 너무 슬픈 일이 있었다. 눈물이 멈추지 않았다.")
                
                assert result['emotion'] == 'sad'
                assert result['emotion_label'] == '슬픔'
    
    def test_analyze_short_content(self, mock_openai, mock_settings):
        """너무 짧은 내용 처리"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("안녕")
                
                assert result['emotion'] == 'peaceful'
                assert result['score'] == 50
                assert '짧아' in result['reason']
    
    def test_analyze_empty_content(self, mock_openai, mock_settings):
        """빈 내용 처리"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("")
                
                assert result['emotion'] == 'peaceful'
                assert result['score'] == 50
    
    def test_analyze_invalid_emotion_fallback(self, mock_openai, mock_settings):
        """유효하지 않은 감정 값에 대한 폴백"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                mock_response = MagicMock()
                mock_response.choices = [MagicMock(message=MagicMock(
                    content='{"emotion": "unknown_emotion", "score": 50, "reason": "테스트"}'
                ))]
                mock_openai.chat.completions.create.return_value = mock_response
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("테스트 일기 내용입니다. 무언가를 적어봅니다.")
                
                # 유효하지 않은 감정은 peaceful로 폴백
                assert result['emotion'] == 'peaceful'
    
    def test_analyze_invalid_score_fallback(self, mock_openai, mock_settings):
        """유효하지 않은 점수에 대한 폴백"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                mock_response = MagicMock()
                mock_response.choices = [MagicMock(message=MagicMock(
                    content='{"emotion": "happy", "score": 150, "reason": "높은 점수"}'
                ))]
                mock_openai.chat.completions.create.return_value = mock_response
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("긴 일기 내용입니다. 충분히 긴 텍스트입니다.")
                
                # 유효하지 않은 점수는 50으로 폴백
                assert result['score'] == 50
    
    def test_analyze_json_error_fallback(self, mock_openai, mock_settings):
        """JSON 파싱 에러 시 폴백 분석"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                mock_response = MagicMock()
                mock_response.choices = [MagicMock(message=MagicMock(
                    content='잘못된 JSON 응답'
                ))]
                mock_openai.chat.completions.create.return_value = mock_response
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("행복한 하루였다. 웃음이 멈추지 않았다.")
                
                # 폴백 분석 결과 (키워드 기반)
                assert 'emotion' in result
                assert 'emotion_label' in result
    
    def test_analyze_api_error_fallback(self, mock_openai, mock_settings):
        """API 에러 시 폴백 분석"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                mock_openai.chat.completions.create.side_effect = Exception("API Error")
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer.analyze("슬픈 하루였다. 눈물이 났다.")
                
                # 폴백 분석으로 키워드 기반 결과
                assert 'emotion' in result
                assert result['emotion'] == 'sad'


class TestFallbackAnalysis:
    """폴백 분석 테스트 (키워드 기반)"""
    
    def test_fallback_happy_keywords(self, mock_openai, mock_settings):
        """행복 키워드 감지"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("오늘은 정말 기쁘다! 좋은 날이었다.")
                
                assert result['emotion'] == 'happy'
                # '기쁘' 또는 '좋았' 키워드가 감지됨
                assert result['emotion'] == 'happy'
    
    def test_fallback_sad_keywords(self, mock_openai, mock_settings):
        """슬픔 키워드 감지"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("너무 슬프다. 우울한 하루였다.")
                
                assert result['emotion'] == 'sad'
    
    def test_fallback_angry_keywords(self, mock_openai, mock_settings):
        """화남 키워드 감지"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("정말 화나는 일이 있었다.")
                
                assert result['emotion'] == 'angry'
    
    def test_fallback_anxious_keywords(self, mock_openai, mock_settings):
        """불안 키워드 감지"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("시험이 걱정된다.")
                
                assert result['emotion'] == 'anxious'
    
    def test_fallback_tired_keywords(self, mock_openai, mock_settings):
        """피곤 키워드 감지"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("너무 피곤하다. 지친 하루.")
                
                assert result['emotion'] == 'tired'
    
    def test_fallback_love_keywords(self, mock_openai, mock_settings):
        """사랑 키워드 감지"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("정말 감사한 마음이 든다. 고마워.")
                
                assert result['emotion'] == 'love'
    
    def test_fallback_no_keywords(self, mock_openai, mock_settings):
        """키워드 없을 때 기본값"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                analyzer = emotion_service.EmotionAnalyzer()
                result = analyzer._fallback_analysis("오늘 밥을 먹었다. 날씨가 흐렸다.")
                
                assert result['emotion'] == 'peaceful'
                assert '감지되지 않았습니다' in result['reason']


class TestValidEmotions:
    """유효한 감정 목록 테스트"""
    
    def test_valid_emotions_list(self, mock_openai, mock_settings):
        """유효한 감정 목록 확인"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                expected_emotions = ['happy', 'sad', 'angry', 'anxious', 'peaceful', 'excited', 'tired', 'love']
                
                assert emotion_service.EmotionAnalyzer.VALID_EMOTIONS == expected_emotions
    
    def test_emotion_labels(self, mock_openai, mock_settings):
        """감정 라벨 매핑 확인"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                labels = emotion_service.EmotionAnalyzer.EMOTION_LABELS
                
                assert labels['happy'] == '행복'
                assert labels['sad'] == '슬픔'
                assert labels['angry'] == '화남'
                assert labels['anxious'] == '불안'
                assert labels['peaceful'] == '평온'
                assert labels['excited'] == '신남'
                assert labels['tired'] == '피곤'
                assert labels['love'] == '사랑'


@pytest.mark.django_db
class TestAnalyzeDiaryEmotion:
    """analyze_diary_emotion 함수 테스트"""
    
    def test_analyze_and_save(self, mock_openai, mock_settings):
        """일기 감정 분석 후 저장"""
        with patch.dict(sys.modules, {'openai': mock_openai}):
            with patch('diary.emotion_service.settings', mock_settings):
                import importlib
                import diary.emotion_service as emotion_service
                importlib.reload(emotion_service)
                
                with patch.object(emotion_service, 'EmotionAnalyzer') as mock_analyzer_class:
                    # 모의 분석 결과
                    mock_analyzer = MagicMock()
                    mock_analyzer.analyze.return_value = {
                        'emotion': 'happy',
                        'emotion_label': '행복',
                        'score': 80,
                        'reason': '행복한 내용'
                    }
                    mock_analyzer_class.return_value = mock_analyzer
                    
                    # 모의 Diary 객체
                    mock_diary = MagicMock()
                    mock_diary.decrypt_content.return_value = "오늘은 행복한 하루였다."
                    
                    result = emotion_service.analyze_diary_emotion(mock_diary)
                    
                    # 분석 결과 확인
                    assert result['emotion'] == 'happy'
                    assert result['score'] == 80
                    
                    # Diary 객체에 저장되었는지 확인
                    assert mock_diary.emotion == 'happy'
                    assert mock_diary.emotion_score == 80
                    mock_diary.save.assert_called_once_with(
                        update_fields=['emotion', 'emotion_score', 'emotion_analyzed_at']
                    )
