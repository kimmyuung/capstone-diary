# diary/views/social_auth_views.py
"""
소셜 로그인 API 뷰
- Google OAuth2
- Kakao OAuth2

클라이언트에서 소셜 로그인 후 받은 ID 토큰/액세스 토큰을 검증하고
자체 JWT 토큰을 발급합니다.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
import requests

User = get_user_model()


class GoogleLoginView(APIView):
    """
    Google OAuth2 로그인
    
    POST /api/auth/google/
    
    Request Body:
        {
            "id_token": "Google ID Token from client"
        }
    
    Response:
        {
            "refresh": "...",
            "access": "...",
            "user": {"id": 1, "username": "...", "email": "..."}
        }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        id_token = request.data.get('id_token')
        
        if not id_token:
            return Response(
                {'error': 'ID token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Google ID Token 검증
        try:
            google_response = requests.get(
                f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}'
            )
            
            if google_response.status_code != 200:
                return Response(
                    {'error': 'Invalid Google token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            google_data = google_response.json()
            
            # 클라이언트 ID 검증 (선택적)
            expected_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None)
            if expected_client_id and google_data.get('aud') != expected_client_id:
                return Response(
                    {'error': 'Invalid client ID'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            email = google_data.get('email')
            name = google_data.get('name', '')
            
            if not email:
                return Response(
                    {'error': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 사용자 생성 또는 조회
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': name,
                }
            )
            
            # JWT 토큰 발급
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                },
                'created': created,  # 신규 가입 여부
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class KakaoLoginView(APIView):
    """
    Kakao OAuth2 로그인
    
    POST /api/auth/kakao/
    
    Request Body:
        {
            "access_token": "Kakao Access Token from client"
        }
    
    Response:
        {
            "refresh": "...",
            "access": "...",
            "user": {"id": 1, "username": "...", "email": "..."}
        }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        access_token = request.data.get('access_token')
        
        if not access_token:
            return Response(
                {'error': 'Access token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kakao 사용자 정보 조회
        try:
            kakao_response = requests.get(
                'https://kapi.kakao.com/v2/user/me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if kakao_response.status_code != 200:
                return Response(
                    {'error': 'Invalid Kakao token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            kakao_data = kakao_response.json()
            kakao_account = kakao_data.get('kakao_account', {})
            profile = kakao_account.get('profile', {})
            
            # 이메일 동의 여부 확인
            email = kakao_account.get('email')
            nickname = profile.get('nickname', '')
            kakao_id = str(kakao_data.get('id'))
            
            # 이메일이 없는 경우 kakao_{id}@kakao.local 형식 사용
            if not email:
                email = f'kakao_{kakao_id}@kakao.local'
            
            # 사용자 생성 또는 조회
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f'kakao_{kakao_id}',
                    'first_name': nickname,
                }
            )
            
            # JWT 토큰 발급
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                },
                'created': created,
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
