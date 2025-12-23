# diary/views/push_views.py
"""
푸시 알림 관련 API 뷰
- 푸시 토큰 등록
- 푸시 토큰 해제
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..messages import (
    ERROR_PUSH_TOKEN_REQUIRED,
    ERROR_PUSH_TOKEN_NOT_FOUND,
    SUCCESS_PUSH_TOKEN_REGISTERED,
    SUCCESS_PUSH_TOKEN_UPDATED,
    SUCCESS_PUSH_DISABLED,
)


class PushTokenView(APIView):
    """
    푸시 토큰 관리 API
    
    POST: 푸시 토큰 등록
    DELETE: 푸시 토큰 해제
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        푸시 토큰 등록
        
        Request Body:
            {
                "token": "ExponentPushToken[xxxxx]",
                "device_type": "android" | "ios",
                "device_name": "Samsung Galaxy S21" (선택)
            }
        
        Response:
            {
                "message": "푸시 토큰이 등록되었습니다.",
                "token_id": 1
            }
        """
        from ..models import PushToken
        
        token = request.data.get('token')
        device_type = request.data.get('device_type', 'android')
        device_name = request.data.get('device_name', '')
        
        if not token:
            return Response(
                {'error': str(ERROR_PUSH_TOKEN_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기존 토큰이 있으면 업데이트, 없으면 생성
        push_token, created = PushToken.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'device_name': device_name,
                'is_active': True,
            }
        )
        
        message = str(SUCCESS_PUSH_TOKEN_REGISTERED) if created else str(SUCCESS_PUSH_TOKEN_UPDATED)
        return Response({
            'message': message,
            'token_id': push_token.id,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    def delete(self, request):
        """
        푸시 토큰 비활성화
        
        Request Body:
            {
                "token": "ExponentPushToken[xxxxx]"
            }
        
        Response:
            {
                "message": "푸시 알림이 비활성화되었습니다."
            }
        """
        from ..models import PushToken
        
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': str(ERROR_PUSH_TOKEN_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 토큰 비활성화
        updated = PushToken.objects.filter(
            token=token,
            user=request.user
        ).update(is_active=False)
        
        if updated:
            return Response({
                'message': str(SUCCESS_PUSH_DISABLED),
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': str(ERROR_PUSH_TOKEN_NOT_FOUND)},
                status=status.HTTP_404_NOT_FOUND
            )

