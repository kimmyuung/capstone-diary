from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from ..services.chat_service import ChatService

from django.http import StreamingHttpResponse

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
