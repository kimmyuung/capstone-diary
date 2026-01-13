import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from django.conf import settings
from diary.models import DiaryEmbedding, Diary
import logging

logger = logging.getLogger(__name__)

# Load local embedding model (lightweight)
# This will download the model on first run (approx 90MB)
# Load local embedding model (lightweight)
# Lazy loading to prevent download during build
EMBEDDING_MODEL = None

def get_embedding_model():
    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is None:
        EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return EMBEDDING_MODEL

class ChatService:
    @staticmethod
    def get_embedding(text):
        """텍스트를 384차원 벡터로 변환"""
        model = get_embedding_model()
        return model.encode(text).tolist()

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
        """
        [RAG 고도화] 하이브리드 가중치 검색
        1. Hybrid Retrieval: Vector Search (Top 30) + Keyword Search (Top 10)
        2. Ranking: Similarity + Recency + Seasonality + Keyword Bonus
        """
        from datetime import datetime
        import math
        from django.db.models import Q
        from ..ai_service import KeywordExtractor
        
        # 1. 임베딩 생성 및 키워드 추출
        query_vector = ChatService.get_embedding(query)
        
        extractor = KeywordExtractor()
        keywords = extractor.extract_keywords(query, top_n=3) # 검색용이므로 소수만
        
        # 2-1. Vector Candidates (Top 30)
        # return ONLY IDs first to merge efficiently
        vector_candidate_ids = list(DiaryEmbedding.objects.filter(diary__user=user) \
            .order_by(DiaryEmbedding.vector.l2_distance(query_vector)) \
            .values_list('id', flat=True)[:30])
            
        # 2-2. Keyword Candidates (Top 10)
        keyword_candidate_ids = []
        if keywords:
            keyword_q = Q()
            for k in keywords:
                # 제목이나 내용에 키워드가 포함된 경우
                keyword_q |= Q(diary__title__icontains=k) | Q(diary__content__icontains=k)
            
            keyword_candidate_ids = list(DiaryEmbedding.objects.filter(diary__user=user) \
                .filter(keyword_q) \
                .exclude(id__in=vector_candidate_ids) \
                .values_list('id', flat=True)[:10])
                
        # 3. Merge Candidates & Fetch Data
        all_candidate_ids = vector_candidate_ids + keyword_candidate_ids
        
        if not all_candidate_ids:
            return []
            
        # 한 번의 쿼리로 Distance Annotation과 함께 조회
        candidates = DiaryEmbedding.objects.filter(id__in=all_candidate_ids) \
            .annotate(distance=DiaryEmbedding.vector.l2_distance(query_vector)) \
            .select_related('diary')
            
        # 4. 점수 계산 및 재정렬
        scored_results = []
        now = datetime.now()
        
        for embedding in candidates:
            diary = embedding.diary
            dist = embedding.distance
            
            # (1) Similarity Score (기본 점수)
            # Distance 0 -> 1.0, Distance 1 -> 0.5
            similarity_score = 1.0 / (1.0 + (dist if dist is not None else 1.0))
            
            # (2) Recency Score (최신성)
            days_diff = (now.date() - diary.created_at.date()).days
            recency_score = 1.0 / (1.0 + (days_diff / 365.0))
            
            # (3) Seasonality Score (계절성)
            seasonality_bonus = 0.0
            if diary.created_at.month == now.month:
                seasonality_bonus = 0.15
                
            # (4) Keyword Bonus (키워드 매칭)
            # 키워드가 실제로 포함되어 있으면 보너스
            keyword_bonus = 0.0
            if keywords:
                match_count = 0
                content_lower = diary.decrypt_content().lower() # 복호화 비용 고려 (필요시)
                # 여기서는 decrypt_content()가 이미 diary 객체에 캐싱되어 있지 않다면 DB 히트가 발생할 수 있음
                # 하지만 candidates가 최대 40개이므로 감당 가능
                title_lower = diary.title.lower()
                
                for k in keywords:
                    k_lower = k.lower()
                    if k_lower in title_lower or k_lower in content_lower:
                        match_count += 1
                
                if match_count > 0:
                    keyword_bonus = 0.2 + (match_count * 0.05) # 기본 0.2 + 개당 0.05
            
            # --- Final Score Calculation ---
            # Hybrid Weighting:
            # - Similarity: 60%
            # - Recency: 20%
            # - Keyword: Bonus (Dynamic)
            # - Seasonality: Bonus (Static)
            
            final_score = (similarity_score * 0.6) + (recency_score * 0.2) + seasonality_bonus + keyword_bonus
            
            # 검색어가 "작년" 등을 포함하면 Seasonality 비중을 높이는 등의 동적 조절도 가능하나,
            # 여기서는 정적 가중치 사용
            
            scored_results.append((final_score, diary))
            
        # 점수 내림차순 정렬
        scored_results.sort(key=lambda x: x[0], reverse=True)
        
        return [item[1] for item in scored_results[:limit]]

    @staticmethod
    def search_summaries(user, query, limit=3):
        """
        [RAG 고도화] 계층적 메모리 검색
        질문과 유사한 '요약(Summary)' 검색 (L2 Distance)
        """
        from ..models import DiarySummary
        
        query_vector = ChatService.get_embedding(query)
        
        # pgvector L2 distance
        summaries = DiarySummary.objects.filter(user=user) \
            .order_by(DiarySummary.vector.l2_distance(query_vector))[:limit]
            
        return list(summaries)

    @staticmethod
    def generate_chat_response(user, message, history=[]):
        """RAG 기반 답변 생성 (Gemini) - Hybrid & Hierarchical"""
        
        # 1. 계층적 검색 (요약본 검색) - Broad Context
        # 질문이 포괄적인 경우 요약본이 높은 유사도를 가질 것임
        related_summaries = ChatService.search_summaries(user, message, limit=2)
        
        # 2. 세부 검색 (일기 검색) - Detail Context
        related_diaries = ChatService.search_similar_diaries(user, message, limit=5)
        
        # 3. 프롬프트 구성
        context_parts = []
        
        # 3-1. 요약 Context (상위 레벨)
        if related_summaries:
            summary_text = "\n".join([
                f"- [{s.period_type}] {s.start_date}~{s.end_date}: {s.summary_text}"
                for s in related_summaries
            ])
            context_parts.append(f"=== Period Summaries (Contextual Overview) ===\n{summary_text}")
            
        # 3-2. 일기 Context (세부 레벨)
        if related_diaries:
            diary_text = "\n".join([
                f"- [{d.created_at.strftime('%Y-%m-%d')}] {d.title}: {d.decrypt_content()} (Emotion: {d.emotion})"
                for d in related_diaries
            ])
            context_parts.append(f"=== Specific Diary Entries ===\n{diary_text}")
            
        diary_context = "\n\n".join(context_parts)

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
        Answer the user's question based on the provided 'Period Summaries' (overview) and 'Specific Diary Entries' (details).
        
        Strategy:
        1. If the user asks about a general trend (e.g., "How was I lately?"), focus on the Period Summaries.
        2. If the user asks about specific events, focus on Specific Diary Entries.
        3. If the answer is not in the context, say "I don't remember that in your diaries."
        4. Be empathetic and friendly.
        
        [Context]
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
                {'role': 'user', 'parts': [system_prompt.strip() + f"\n\nCurrent Question: {message}"]}
            ])
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return "Sorry, I'm having trouble thinking right now."

    @staticmethod
    def generate_reflection_question(diary):
        """일기 내용을 토대로 회고 질문 생성"""
        if not settings.GEMINI_API_KEY:
            return None

        # 프롬프트 구성
        # System instructions included directly to avoid dependency on global configs for now
        prompt = f"""
You are an empathetic counselor. Read the following diary entry and ask one single, deep question that helps the writer reflect on their emotions or situation.
The question should be warm, short (under 2 sentences), and in Korean.

Diary:
Title: {diary.title}
Content: {diary.content}
Emotion: {diary.emotion}

Question:
"""
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_TEXT_MODEL)
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Reflection generation failed: {e}")
            return None
