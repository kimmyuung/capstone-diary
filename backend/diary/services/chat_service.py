import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from django.conf import settings
from diary.models import DiaryEmbedding, Diary
import logging

logger = logging.getLogger(__name__)

# Load local embedding model (lightweight)
# This will download the model on first run (approx 90MB)
EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')

class ChatService:
    @staticmethod
    def get_embedding(text):
        """텍스트를 384차원 벡터로 변환"""
        return EMBEDDING_MODEL.encode(text).tolist()

    @staticmethod
    def update_diary_embedding(diary):
        """일기 저장 시 임베딩 업데이트"""
        text = f"Title: {diary.title}\nContent: {diary.content}\nEmotion: {diary.emotion or 'None'}"
        vector = ChatService.get_embedding(text)
        
        DiaryEmbedding.objects.update_or_create(
            diary=diary,
            defaults={'vector': vector}
        )
        logger.info(f"Updated embedding for diary {diary.id}")

    @staticmethod
    def search_similar_diaries(user, query, limit=5):
        """질문과 유사한 일기 검색 (L2 Distance)"""
        query_vector = ChatService.get_embedding(query)
        
        # pgvector L2 distance search (<-> operator)
        # Django ORM support via pgvector
        embeddings = DiaryEmbedding.objects.filter(diary__user=user) \
            .order_by(DiaryEmbedding.vector.l2_distance(query_vector))[:limit]
            
        return [e.diary for e in embeddings]

    @staticmethod
    def generate_chat_response(user, message, history=[]):
        """RAG 기반 답변 생성 (Gemini)"""
        # 1. 관련 일기 검색
        related_diaries = ChatService.search_similar_diaries(user, message)
        
        # 2. 프롬프트 구성
        # 2-1. 일기 컨텍스트
        diary_context = "\n\n".join([
            f"- [{d.created_at.strftime('%Y-%m-%d')}] {d.title}: {d.content} (Emotion: {d.emotion})"
            for d in related_diaries
        ])

        # 2-2. 대화 히스토리 포맷팅 (최근 10개만 유지)
        chat_history_text = ""
        if history:
            recent_history = history[-10:]
            chat_history_text = "Chat History:\n" + "\n".join([
                f"{'User' if msg.get('role') == 'user' else 'AI'}: {msg.get('content')}"
                for msg in recent_history
            ])
        
        system_prompt = f"""
You are a 'Diary AI Assistant'. The user is asking you questions about their past journals.
Answer the user's question based on the following diary context and chat history.
If the answer is not in the context, say "I don't remember that in your diaries."
Be empathetic and friendly.

User's Diaries:
{diary_context}

{chat_history_text}
"""
        
        # 3. Gemini API 호출
        if not settings.GEMINI_API_KEY:
            return "Gemini API Key is not configured."

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
        
        try:
            response = model.generate_content([
                {'role': 'user', 'parts': [system_prompt + f"\n\nCurrent Question: {message}"]}
            ])
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return "Sorry, I'm having trouble thinking right now."
