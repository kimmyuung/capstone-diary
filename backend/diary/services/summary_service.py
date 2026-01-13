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
