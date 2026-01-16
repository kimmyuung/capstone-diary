from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, viewsets
from rest_framework.decorators import action
from ..services.chat_service import ChatService
from ..models import ChatSession, ChatMessage, Diary

from django.http import StreamingHttpResponse
import logging
import secrets

logger = logging.getLogger(__name__)


class ChatAIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        AI와 대화하기 (RAG) - Streaming
        Request: { "message": "질문 내용" }
        Response: Stream of text chunks (Content-Type: text/plain)
        """
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        history = request.data.get('history', [])
        
        try:
            # Generator 반환
            response_generator = ChatService.generate_chat_response(request.user, message, history)
            
            # StreamingResponse 반환
            return StreamingHttpResponse(
                response_generator, 
                content_type='text/plain'
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatSessionViewSet(viewsets.ViewSet):
    """
    AI 채팅 세션 ViewSet
    
    - GET /api/chat/sessions/ - 세션 목록
    - POST /api/chat/sessions/ - 새 세션 생성
    - GET /api/chat/sessions/{id}/ - 세션 상세 (메시지 포함)
    - DELETE /api/chat/sessions/{id}/ - 세션 삭제
    - POST /api/chat/sessions/{id}/send/ - 메시지 전송
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self, request):
        return ChatSession.objects.filter(
            user=request.user,
            is_active=True
        ).prefetch_related('messages')
    
    def list(self, request):
        """세션 목록 조회"""
        sessions = self.get_queryset(request)
        
        result = []
        for session in sessions:
            last_message = session.messages.last()
            result.append({
                'id': session.id,
                'title': session.title,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat(),
                'message_count': session.messages.count(),
                'last_message_preview': last_message.content[:50] if last_message else None,
            })
        
        return Response({'count': len(result), 'sessions': result})
    
    def create(self, request):
        """새 채팅 세션 생성"""
        title = request.data.get('title', '새 대화')
        
        session = ChatSession.objects.create(
            user=request.user,
            title=title[:100]
        )
        
        return Response({
            'id': session.id,
            'title': session.title,
            'created_at': session.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, pk=None):
        """세션 상세 조회"""
        try:
            session = self.get_queryset(request).get(pk=pk)
        except ChatSession.DoesNotExist:
            return Response({'error': '세션을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        messages = [
            {'id': m.id, 'role': m.role, 'content': m.content, 'created_at': m.created_at.isoformat()}
            for m in session.messages.all()
        ]
        
        return Response({'id': session.id, 'title': session.title, 'messages': messages})
    
    def destroy(self, request, pk=None):
        """세션 삭제 (소프트 삭제)"""
        try:
            session = self.get_queryset(request).get(pk=pk)
            session.is_active = False
            session.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ChatSession.DoesNotExist:
            return Response({'error': '세션을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'], url_path='send')
    def send_message(self, request, pk=None):
        """메시지 전송"""
        try:
            session = self.get_queryset(request).get(pk=pk)
        except ChatSession.DoesNotExist:
            return Response({'error': '세션을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        user_content = request.data.get('message', '').strip()
        if not user_content:
            return Response({'error': '메시지를 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_msg = ChatMessage.objects.create(session=session, role='user', content=user_content)
            
            context = list(session.messages.order_by('-created_at')[:10])[::-1]
            ai_response = ChatService.chat_with_context(request.user, user_content, context)
            
            assistant_msg = ChatMessage.objects.create(session=session, role='assistant', content=ai_response)
            session.save()
            
            if session.messages.count() == 2:
                session.title = user_content[:30] + ('...' if len(user_content) > 30 else '')
                session.save()
            
            return Response({
                'user_message': {'id': user_msg.id, 'role': 'user', 'content': user_msg.content},
                'assistant_message': {'id': assistant_msg.id, 'role': 'assistant', 'content': assistant_msg.content}
            })
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DiaryShareView(APIView):
    """일기 공유 API"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, diary_id):
        """공유 링크 생성"""
        try:
            diary = Diary.objects.get(pk=diary_id, user=request.user)
        except Diary.DoesNotExist:
            return Response({'error': '일기를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        if diary.share_token:
            return Response({'share_token': diary.share_token, 'share_url': f"/shared/{diary.share_token}"})
        
        diary.share_token = secrets.token_urlsafe(16)
        diary.is_public = True
        diary.save()
        
        return Response({'share_token': diary.share_token, 'share_url': f"/shared/{diary.share_token}"}, status=status.HTTP_201_CREATED)
    
    def delete(self, request, diary_id):
        """공유 해제"""
        try:
            diary = Diary.objects.get(pk=diary_id, user=request.user)
        except Diary.DoesNotExist:
            return Response({'error': '일기를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        diary.share_token = None
        diary.is_public = False
        diary.save()
        return Response({'message': '공유가 해제되었습니다.'})


class SharedDiaryView(APIView):
    """공개된 일기 조회 (인증 불필요)"""
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        try:
            diary = Diary.objects.get(share_token=token, is_public=True)
        except Diary.DoesNotExist:
            return Response({'error': '공유된 일기를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        content = diary.decrypt_content()
        
        return Response({
            'title': diary.title,
            'content': content,
            'emotion': diary.emotion,
            'emotion_emoji': diary.get_emotion_display_emoji(),
            'created_at': diary.created_at.strftime('%Y-%m-%d'),
            'images': [{'id': img.id, 'url': img.url, 'caption': img.caption} for img in diary.images.all()],
        })

