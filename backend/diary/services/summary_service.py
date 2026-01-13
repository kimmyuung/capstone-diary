import logging
from datetime import timedelta
from django.conf import settings
import google.generativeai as genai

from ..models import Diary, DiarySummary
from .chat_service import ChatService

logger = logging.getLogger(__name__)

class SummaryService:
    """
    일기 요약 서비스 (Hierarchical Memory)
    주간/월간 일기를 모아서 요약하고 저장합니다.
    """
    
    @staticmethod
    def generate_summary(user, period_type, start_date, end_date):
        """
        특정 기간의 일기를 요약하여 DiarySummary 저장
        """
        logger.info(f"Generating {period_type} summary for user {user.id} ({start_date} ~ {end_date})")
        
        # 1. Fetch Diaries
        # created_at__date__range is inclusive
        diaries = Diary.objects.filter(
            user=user,
            created_at__date__range=(start_date, end_date)
        ).order_by('created_at')
        
        if not diaries.exists():
            logger.info("No diaries found for this period.")
            return None
            
        # 2. Prepare Context (Decrypt & Format)
        diary_texts = []
        for d in diaries:
            try:
                content = d.decrypt_content()
                if not content: continue
                # 날짜, 감정, 내용 조합
                diary_texts.append(f"[{d.created_at.strftime('%Y-%m-%d')}] (Emotion: {d.emotion or 'None'})\n{content}")
            except Exception as e:
                logger.error(f"Error decrypting diary {d.id}: {e}")
                continue
            
        if not diary_texts:
            return None

        full_text = "\n\n".join(diary_texts)
        
        # 3. Generate Summary via Gemini
        summary_text = SummaryService._call_gemini_summarizer(full_text, period_type)
        
        if not summary_text:
            return None
            
        # 4. Generate Embedding (Vector)
        # Using ChatService's embedding model (same dimension)
        vector = ChatService.get_embedding(summary_text)
        
        # 5. Save/Update DiarySummary
        summary, created = DiarySummary.objects.update_or_create(
            user=user,
            period_type=period_type,
            start_date=start_date,
            defaults={
                'end_date': end_date,
                'summary_text': summary_text,
                'vector': vector
            }
        )
        
        logger.info(f"Summary saved: {summary}")
        return summary

    @staticmethod
    def _call_gemini_summarizer(context, period_type):
        if not settings.GEMINI_API_KEY:
            logger.error("Gemini API Key missing")
            return None
            
        period_str = "주간" if period_type == 'WEEKLY' else "월간"
        
        prompt = f"""
        다음은 사용자의 {period_str} 일기 모음입니다.
        이 기간 동안의 주요 사건, 전반적인 감정의 흐름, 그리고 반복되는 패턴을 파악하여 3~5문장 내외로 요약해주세요.
        나중에 이 사용자가 "{period_str} 동안 나 어땠어?"라고 물었을 때 답변하기 좋은 형태로 요약해야 합니다.
        구체적인 사건과 감정을 연결해서 서술하세요.
        
        [일기 내용]
        {context[:15000]}
        
        [요약]
        """
        
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            response = model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Gemini Summary Generation failed: {e}")
            return None

    @staticmethod
    def summarize_diary(content: str, style: str = 'default') -> dict:
        """
        단일 일기 내용을 요약합니다.
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
            return {'error': 'Configuration Error'}

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            
            response = model.generate_content([
                {'role': 'user', 'parts': [f"{prompt_instruction}\n\n일기 내용:\n{content}"]}
            ])
            
            summary = response.text.strip()
            return {
                'summary': summary,
                'original_length': len(content),
                'summary_length': len(summary),
                'style': style
            }
            
        except Exception as e:
            logger.error(f"Gemini API error during summarization: {e}")
            return {'error': str(e)}

    @staticmethod
    def suggest_title(content: str) -> str:
        """
        일기 내용을 기반으로 제목을 제안합니다.
        """
        if not content or len(content.strip()) < 10:
            return "오늘의 일기"
        
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            
            prompt = f"""일기 내용을 보고 적절한 제목을 제안해주세요. 
내용: {content[:500]}
규칙: 제목만 반환하세요. 15자 이내로 작성하세요. 다른 말은 하지 마세요."""
            
            response = model.generate_content(prompt)
            title = response.text.strip()
            return title.strip('"\'')
            
        except Exception as e:
            logger.error(f"Error suggesting title: {e}")
            return "오늘의 일기"

    @staticmethod
    def generate_report_insight(diaries, period_label):
        """
        일기 데이터를 바탕으로 종합 감정 리포트(인사이트)를 생성합니다.
        """
        if not diaries:
            return f"이번 {period_label} 기록된 일기가 없어서 분석해드릴 내용이 없어요. 😢"

        if not settings.GEMINI_API_KEY:
            return "AI 분석 기능을 사용할 수 없습니다. (API Key Missing)"

        # 1. 일기 데이터 텍스트화
        diary_summaries = []
        for d in diaries:
            try:
                emotion = d.emotion if d.emotion else "Unknown"
                date = d.created_at.strftime("%Y-%m-%d")
                content_snippet = d.decrypt_content()[:200]
                diary_summaries.append(f"[{date}] (Emotion: {emotion}) {content_snippet}")
            except:
                pass
        
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
