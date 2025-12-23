# diary/tests/test_ai_service.py
"""
AI 서비스 테스트
- ImageGenerator
- SpeechToText
- DiarySummarizer
- TemplateGenerator
"""
import pytest
from unittest.mock import patch, MagicMock


class TestImageGenerator:
    """이미지 생성기 테스트"""
    
    @patch('diary.ai_service.openai')
    def test_generate_image_success(self, mock_openai):
        """이미지 생성 성공 케이스"""
        from diary.ai_service import ImageGenerator
        
        # 모의 응답 설정
        mock_response = MagicMock()
        mock_response.data = [MagicMock(url='https://example.com/generated-image.png')]
        mock_openai.Image.create.return_value = mock_response
        
        generator = ImageGenerator()
        result = generator.generate("오늘은 정말 행복한 하루였다.")
        
        assert 'url' in result
        assert 'prompt' in result
        assert result['url'] == 'https://example.com/generated-image.png'
        mock_openai.Image.create.assert_called_once()
    
    @patch('diary.ai_service.openai')
    def test_generate_image_api_error(self, mock_openai):
        """OpenAI API 에러 시 예외 발생"""
        from diary.ai_service import ImageGenerator
        
        # OpenAI 에러 시뮬레이션
        mock_openai.error.OpenAIError = Exception
        mock_openai.Image.create.side_effect = mock_openai.error.OpenAIError("API Error")
        
        generator = ImageGenerator()
        
        with pytest.raises(Exception) as exc_info:
            generator.generate("test content")
        
        assert "API Error" in str(exc_info.value)
    
    @patch('diary.ai_service.openai')
    def test_generate_image_with_long_content(self, mock_openai):
        """긴 내용의 경우 150자로 잘림"""
        from diary.ai_service import ImageGenerator
        
        mock_response = MagicMock()
        mock_response.data = [MagicMock(url='https://example.com/image.png')]
        mock_openai.Image.create.return_value = mock_response
        
        generator = ImageGenerator()
        long_content = "A" * 200
        result = generator.generate(long_content)
        
        # 프롬프트에 150자만 포함되었는지 확인
        call_args = mock_openai.Image.create.call_args
        prompt = call_args[1]['prompt']
        # 프롬프트에 전체 200자가 아닌 150자까지만 포함됨
        assert "A" * 150 in prompt
        assert "A" * 200 not in prompt


class TestSpeechToText:
    """음성-텍스트 변환 테스트"""
    
    @patch('diary.ai_service.openai')
    def test_transcribe_success(self, mock_openai):
        """음성 변환 성공 케이스"""
        from diary.ai_service import SpeechToText
        
        mock_response = MagicMock()
        mock_response.text = "안녕하세요. 오늘의 일기입니다."
        mock_openai.Audio.transcribe.return_value = mock_response
        
        stt = SpeechToText()
        mock_audio_file = MagicMock()
        result = stt.transcribe(mock_audio_file, language='ko')
        
        assert 'text' in result
        assert 'language' in result
        assert result['text'] == "안녕하세요. 오늘의 일기입니다."
        assert result['language'] == 'ko'
    
    @patch('diary.ai_service.openai')
    def test_transcribe_auto_detect_language(self, mock_openai):
        """언어 자동 감지 케이스"""
        from diary.ai_service import SpeechToText
        
        mock_response = MagicMock()
        mock_response.text = "Hello, this is my diary."
        mock_openai.Audio.transcribe.return_value = mock_response
        
        stt = SpeechToText()
        mock_audio_file = MagicMock()
        result = stt.transcribe(mock_audio_file, language=None)
        
        assert result['language'] == 'auto-detected'
        # language 파라미터 없이 호출되었는지 확인
        call_kwargs = mock_openai.Audio.transcribe.call_args[1]
        assert 'language' not in call_kwargs
    
    @patch('diary.ai_service.openai')
    def test_transcribe_api_error(self, mock_openai):
        """API 에러 시 예외 발생"""
        from diary.ai_service import SpeechToText
        
        mock_openai.error.OpenAIError = Exception
        mock_openai.Audio.transcribe.side_effect = mock_openai.error.OpenAIError("Transcription failed")
        
        stt = SpeechToText()
        mock_audio_file = MagicMock()
        
        with pytest.raises(Exception):
            stt.transcribe(mock_audio_file)
    
    @patch('diary.ai_service.openai')
    def test_translate_to_english_success(self, mock_openai):
        """영어 번역 성공 케이스"""
        from diary.ai_service import SpeechToText
        
        mock_response = MagicMock()
        mock_response.text = "Today was a happy day."
        mock_openai.Audio.translate.return_value = mock_response
        
        stt = SpeechToText()
        mock_audio_file = MagicMock()
        result = stt.translate_to_english(mock_audio_file)
        
        assert 'text' in result
        assert 'original_language' in result
        assert result['text'] == "Today was a happy day."
        assert result['original_language'] == 'auto-detected'
    
    def test_get_supported_languages(self):
        """지원 언어 목록 테스트"""
        from diary.ai_service import SpeechToText
        
        languages = SpeechToText.get_supported_languages()
        
        assert isinstance(languages, dict)
        assert 'ko' in languages
        assert 'en' in languages
        assert 'ja' in languages
        assert languages['ko'] == '한국어'


class TestDiarySummarizer:
    """일기 요약 서비스 테스트"""
    
    @patch('diary.ai_service.openai')
    def test_summarize_default_style(self, mock_openai):
        """기본 스타일 요약 테스트"""
        from diary.ai_service import DiarySummarizer
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="오늘 하루 요약입니다."))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        summarizer = DiarySummarizer()
        content = "오늘은 아주 긴 일기 내용입니다. " * 10
        result = summarizer.summarize(content)
        
        assert 'summary' in result
        assert 'original_length' in result
        assert 'summary_length' in result
        assert 'style' in result
        assert result['style'] == 'default'
    
    @patch('diary.ai_service.openai')
    def test_summarize_short_style(self, mock_openai):
        """짧은 스타일 요약 테스트"""
        from diary.ai_service import DiarySummarizer
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="한 줄 요약"))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        summarizer = DiarySummarizer()
        result = summarizer.summarize("긴 일기 내용입니다. " * 10, style='short')
        
        assert result['style'] == 'short'
    
    @patch('diary.ai_service.openai')
    def test_summarize_bullet_style(self, mock_openai):
        """불릿 스타일 요약 테스트"""
        from diary.ai_service import DiarySummarizer
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="• 포인트1\n• 포인트2"))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        summarizer = DiarySummarizer()
        result = summarizer.summarize("긴 일기 내용입니다. " * 10, style='bullet')
        
        assert result['style'] == 'bullet'
        assert '•' in result['summary']
    
    def test_summarize_short_content(self):
        """너무 짧은 내용 처리"""
        from diary.ai_service import DiarySummarizer
        
        summarizer = DiarySummarizer()
        result = summarizer.summarize("짧음")
        
        assert 'error' in result
        assert result['summary'] == "짧음"
    
    def test_summarize_empty_content(self):
        """빈 내용 처리"""
        from diary.ai_service import DiarySummarizer
        
        summarizer = DiarySummarizer()
        result = summarizer.summarize("")
        
        assert 'error' in result
    
    @patch('diary.ai_service.openai')
    def test_suggest_title_success(self, mock_openai):
        """제목 제안 성공 케이스"""
        from diary.ai_service import DiarySummarizer
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="\"행복한 하루\""))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        summarizer = DiarySummarizer()
        title = summarizer.suggest_title("오늘은 정말 행복한 하루였습니다. " * 5)
        
        # 따옴표가 제거되었는지 확인
        assert title == "행복한 하루"
    
    def test_suggest_title_short_content(self):
        """짧은 내용에 대한 기본 제목 반환"""
        from diary.ai_service import DiarySummarizer
        
        summarizer = DiarySummarizer()
        title = summarizer.suggest_title("짧음")
        
        assert title == "오늘의 일기"
    
    @patch('diary.ai_service.openai')
    def test_suggest_title_api_error_fallback(self, mock_openai):
        """API 에러 시 기본 제목 반환"""
        from diary.ai_service import DiarySummarizer
        
        mock_openai.ChatCompletion.create.side_effect = Exception("API Error")
        
        summarizer = DiarySummarizer()
        title = summarizer.suggest_title("충분히 긴 일기 내용입니다.")
        
        assert title == "오늘의 일기"


class TestTemplateGenerator:
    """템플릿 생성기 테스트"""
    
    @patch('diary.ai_service.openai')
    def test_generate_template_success(self, mock_openai):
        """템플릿 생성 성공 케이스"""
        from diary.ai_service import TemplateGenerator
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="""
{
    "name": "독서 일기",
    "emoji": "📚",
    "description": "읽은 책에 대한 감상을 기록합니다",
    "content": "📖 오늘 읽은 책:\\n\\n✍️ 인상 깊은 문장:\\n\\n💭 나의 생각:\\n"
}
"""))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        generator = TemplateGenerator()
        result = generator.generate("독서 일기")
        
        assert 'name' in result
        assert 'emoji' in result
        assert 'description' in result
        assert 'content' in result
        assert result['name'] == "독서 일기"
        assert result['emoji'] == "📚"
    
    @patch('diary.ai_service.openai')
    def test_generate_template_with_code_block(self, mock_openai):
        """코드 블록이 포함된 응답 처리"""
        from diary.ai_service import TemplateGenerator
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="""```json
{
    "name": "운동 일기",
    "emoji": "🏃",
    "description": "운동 기록",
    "content": "오늘의 운동:\\n"
}
```"""))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        generator = TemplateGenerator()
        result = generator.generate("운동 일기")
        
        assert result['name'] == "운동 일기"
        assert result['emoji'] == "🏃"
    
    def test_generate_template_short_topic(self):
        """너무 짧은 주제 에러"""
        from diary.ai_service import TemplateGenerator
        
        generator = TemplateGenerator()
        
        with pytest.raises(ValueError) as exc_info:
            generator.generate("A")
        
        assert "2자 이상" in str(exc_info.value)
    
    def test_generate_template_empty_topic(self):
        """빈 주제 에러"""
        from diary.ai_service import TemplateGenerator
        
        generator = TemplateGenerator()
        
        with pytest.raises(ValueError):
            generator.generate("")
    
    @patch('diary.ai_service.openai')
    def test_generate_template_json_error_fallback(self, mock_openai):
        """JSON 파싱 에러 시 폴백 템플릿 반환"""
        from diary.ai_service import TemplateGenerator
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="잘못된 JSON 응답"))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        generator = TemplateGenerator()
        result = generator.generate("테스트 템플릿")
        
        # 폴백 템플릿이 반환됨
        assert result['name'] == "테스트 템플릿"
        assert result['emoji'] == "📝"
        assert "테스트 템플릿" in result['description']
    
    @patch('diary.ai_service.openai')
    def test_generate_template_different_styles(self, mock_openai):
        """다른 스타일 옵션 테스트"""
        from diary.ai_service import TemplateGenerator
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="""
{
    "name": "간단 일기",
    "emoji": "✏️",
    "description": "간단한 기록",
    "content": "오늘:\\n"
}
"""))]
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        generator = TemplateGenerator()
        
        # simple 스타일
        result = generator.generate("간단 일기", style='simple')
        assert 'name' in result
        
        # detailed 스타일  
        result = generator.generate("상세 일기", style='detailed')
        assert 'name' in result
