# diary/views/auth_views.py
"""
인증 관련 API 뷰
- 회원가입
- 이메일 인증
- 비밀번호 재설정
- 아이디 찾기
- 커스텀 로그인 (이메일 미인증 처리)
"""
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import authenticate

from ..serializers import UserRegisterSerializer
from ..messages import (
    ERROR_EMAIL_REQUIRED,
    ERROR_EMAIL_CODE_REQUIRED,
    ERROR_ALL_FIELDS_REQUIRED,
    ERROR_INVALID_REQUEST,
    ERROR_INVALID_CODE,
    ERROR_CODE_EXPIRED,
    ERROR_ALREADY_VERIFIED,
    ERROR_EMAIL_SEND_FAILED,
    SUCCESS_CODE_SENT,
    SUCCESS_CODE_SENT_10MIN,
    SUCCESS_CODE_SENT_30MIN,
    SUCCESS_EMAIL_VERIFIED,
    SUCCESS_PASSWORD_CHANGED_LOGIN,
    SUCCESS_USERNAME_SENT,
    SUCCESS_CODE_SENT_IF_EXISTS,
    SUCCESS_USERNAME_SENT_IF_EXISTS,
)
from config.throttling import (
    LoginRateThrottle,
    RegisterRateThrottle,
    PasswordResetRateThrottle,
    EmailResendRateThrottle,
)
from drf_spectacular.utils import extend_schema, OpenApiResponse
from ..schema_examples import (
    EXAMPLE_400_BAD_REQUEST, EXAMPLE_400_INVALID_PARAM,
    EXAMPLE_401_UNAUTHORIZED, EXAMPLE_429_THROTTLED,
    EXAMPLE_500_SERVER_ERROR
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    커스텀 로그인 API (이메일 미인증 사용자 처리)
    
    POST /api/token/
    
    Request Body:
        {
            "username": "사용자명",
            "password": "비밀번호"
        }
    
    Response (200 OK):
        {
            "access": "...",
            "refresh": "..."
        }
    
    Response (401 Unauthorized - 이메일 미인증):
        {
            "error": "EMAIL_NOT_VERIFIED",
            "message": "이메일 인증이 필요합니다. 이메일을 확인해주세요.",
            "email": "user@example.com"
        }
    
    Response (401 Unauthorized - 일반):
        {
            "error": "INVALID_CREDENTIALS",
            "message": "아이디 또는 비밀번호가 올바르지 않습니다."
        }
    """
    throttle_classes = [LoginRateThrottle]
    
    @extend_schema(
        summary="로그인",
        description="사용자명과 비밀번호로 로그인하여 Access/Refresh Token을 발급받습니다.",
        responses={
            200: OpenApiResponse(description="로그인 성공"),
            401: OpenApiResponse(description="인증 실패 (아이디/비번 불일치 또는 이메일 미인증)", examples=[EXAMPLE_401_UNAUTHORIZED]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
        }
    )
    def post(self, request, *args, **kwargs):
        from django.contrib.auth.models import User
        
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        
        # 사용자 존재 여부 및 이메일 인증 상태 확인
        try:
            user = User.objects.get(username=username)
            
            # 비밀번호 확인
            if not user.check_password(password):
                return Response({
                    "error": "INVALID_CREDENTIALS",
                    "message": "아이디 또는 비밀번호가 올바르지 않습니다."
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # 이메일 미인증 사용자 처리
            if not user.is_active:
                return Response({
                    "error": "EMAIL_NOT_VERIFIED",
                    "message": "이메일 인증이 필요합니다. 이메일을 확인해주세요.",
                    "email": user.email
                }, status=status.HTTP_401_UNAUTHORIZED)
            
        except User.DoesNotExist:
            return Response({
                "error": "INVALID_CREDENTIALS",
                "message": "아이디 또는 비밀번호가 올바르지 않습니다."
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 정상 로그인 처리 (SimpleJWT 기본 로직)
        try:
            return super().post(request, *args, **kwargs)
        except InvalidToken as e:
            return Response({
                "error": "INVALID_CREDENTIALS",
                "message": "아이디 또는 비밀번호가 올바르지 않습니다."
            }, status=status.HTTP_401_UNAUTHORIZED)


class RegisterView(generics.CreateAPIView):
    """
    회원가입 API (이메일 인증 필요)
    
    POST /api/register/
    
    1. 회원가입 요청 → 계정 생성 (비활성화 상태) → 이메일로 인증코드 전송
    2. POST /api/email/verify/ 로 인증코드 확인 → 계정 활성화
    
    Request Body:
        {
            "username": "사용자명",
            "email": "이메일 (필수, 중복 불가)",
            "password": "비밀번호",
            "password_confirm": "비밀번호 확인"
        }
    
    Response (201 Created):
        {
            "message": "인증 코드가 이메일로 전송되었습니다.",
            "email": "이메일",
            "requires_verification": true
        }
    """
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]  # 시간당 5회 제한

    @extend_schema(
        summary="회원가입",
        description="새로운 사용자 계정을 생성하고 이메일 인증 코드를 전송합니다.",
        responses={
            201: OpenApiResponse(description="회원가입 성공 (인증 메일 전송)"),
            400: OpenApiResponse(description="유효성 검사 실패", examples=[EXAMPLE_400_BAD_REQUEST]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
        }
    )
    def create(self, request, *args, **kwargs):
        from ..models import EmailVerificationToken
        from ..email_service import send_email_verification
        from django.conf import settings

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # 환경별 이메일 인증 정책 적용
        email_verification_required = getattr(settings, 'EMAIL_VERIFICATION_REQUIRED', True)
        
        if email_verification_required:
            # [운영 환경] 이메일 인증 필수
            user.is_active = False
            user.save()
            
            # 이메일 인증 토큰 생성 및 전송
            token = EmailVerificationToken.generate_token(user)
            send_email_verification(user, token)

            return Response({
                "message": str(SUCCESS_CODE_SENT_10MIN),
                "email": user.email,
                "requires_verification": True,
                "email_verification_required": True
            }, status=status.HTTP_201_CREATED)
        else:
            # [개발 환경] 이메일 인증 없이 즉시 활성화
            user.is_active = True
            user.save()

            return Response({
                "message": "회원가입이 완료되었습니다. 바로 로그인하세요.",
                "email": user.email,
                "requires_verification": False,
                "email_verification_required": False
            }, status=status.HTTP_201_CREATED)


class EmailVerifyView(APIView):
    """
    이메일 인증 확인 API
    
    POST /api/email/verify/
    
    Request Body:
        {
            "email": "user@example.com",
            "code": "123456"
        }
    
    Response:
        {
            "message": "이메일 인증이 완료되었습니다. 로그인해주세요."
        }
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]  # 분당 5회 제한 (브루트포스 방지)

    @extend_schema(
        summary="이메일 인증 확인",
        description="이메일로 전송된 인증 코드를 확인하여 계정을 활성화합니다.",
        responses={
            200: OpenApiResponse(description="인증 성공"),
            400: OpenApiResponse(description="잘못된 코드 또는 만료된 코드", examples=[EXAMPLE_400_INVALID_PARAM]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
        }
    )
    def post(self, request):
        from django.contrib.auth.models import User
        from ..models import EmailVerificationToken

        email = request.data.get('email', '').strip()
        code = request.data.get('code', '').strip()

        if not email or not code:
            return Response(
                {"error": str(ERROR_EMAIL_CODE_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": str(ERROR_INVALID_REQUEST)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 이미 활성화된 계정
        if user.is_active:
            return Response(
                {"error": str(ERROR_ALREADY_VERIFIED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 토큰 검증
        try:
            token = EmailVerificationToken.objects.get(
                user=user,
                token=code,
                is_verified=False
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"error": str(ERROR_INVALID_CODE)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if token.is_expired:
            return Response(
                {"error": str(ERROR_CODE_EXPIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 인증 완료
        token.is_verified = True
        token.save()

        # 계정 활성화
        user.is_active = True
        user.save()

        return Response({
            "message": str(SUCCESS_EMAIL_VERIFIED)
        })


class ResendVerificationView(APIView):
    """
    인증 코드 재전송 API
    
    POST /api/email/resend/
    
    Request Body:
        {
            "email": "user@example.com"
        }
    """
    permission_classes = [AllowAny]
    throttle_classes = [EmailResendRateThrottle]  # 10분당 3회 제한 (이메일 남용 방지)

    @extend_schema(
        summary="인증 코드 재전송",
        description="이메일 인증 코드를 재전송합니다.",
        responses={
            200: OpenApiResponse(description="재전송 성공"),
            400: OpenApiResponse(description="잘못된 요청", examples=[EXAMPLE_400_BAD_REQUEST]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
        }
    )
    def post(self, request):
        from django.contrib.auth.models import User
        from ..models import EmailVerificationToken
        from ..email_service import send_email_verification

        email = request.data.get('email', '').strip()

        if not email:
            return Response(
                {"error": str(ERROR_EMAIL_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                "message": str(SUCCESS_CODE_SENT_IF_EXISTS)
            })

        # 이미 활성화된 계정
        if user.is_active:
            return Response(
                {"error": str(ERROR_ALREADY_VERIFIED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 새 토큰 생성 및 전송
        token = EmailVerificationToken.generate_token(user)
        send_email_verification(user, token)

        return Response({
            "message": str(SUCCESS_CODE_SENT)
        })


class PasswordResetRequestView(APIView):
    """
    비밀번호 재설정 요청 API
    이메일로 6자리 인증 코드 전송
    
    POST /api/password/reset-request/
    
    Request Body:
        {
            "email": "user@example.com"
        }
    
    Response:
        {
            "message": "인증 코드가 이메일로 전송되었습니다."
        }
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]  # 시간당 3회 제한 (이메일 폭탄 방지)

    @extend_schema(
        summary="비밀번호 재설정 요청",
        description="가입된 이메일로 비밀번호 재설정 인증 코드를 전송합니다.",
        responses={
            200: OpenApiResponse(description="인증 코드 전송 성공"),
            400: OpenApiResponse(description="잘못된 요청", examples=[EXAMPLE_400_BAD_REQUEST]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
            500: OpenApiResponse(description="이메일 전송 실패", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    )
    def post(self, request):
        from django.contrib.auth.models import User
        from ..models import PasswordResetToken
        from ..email_service import send_password_reset_email

        email = request.data.get('email', '').strip()

        if not email:
            return Response(
                {"error": str(ERROR_EMAIL_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # 보안: 이메일 존재 여부를 노출하지 않음
            return Response({
                "message": str(SUCCESS_CODE_SENT_IF_EXISTS)
            })

        # 토큰 생성 및 이메일 전송
        token = PasswordResetToken.generate_token(user)
        email_sent = send_password_reset_email(user, token)

        if email_sent:
            return Response({
                "message": str(SUCCESS_CODE_SENT_30MIN)
            })
        else:
            return Response(
                {"error": str(ERROR_EMAIL_SEND_FAILED)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(APIView):
    """
    비밀번호 재설정 확인 API
    인증 코드 검증 후 새 비밀번호 설정
    
    POST /api/password/reset-confirm/
    
    Request Body:
        {
            "email": "user@example.com",
            "code": "123456",
            "new_password": "newPassword123"
        }
    
    Response:
        {
            "message": "비밀번호가 성공적으로 변경되었습니다."
        }
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]  # 시간당 3회 제한

    @extend_schema(
        summary="비밀번호 재설정 확인",
        description="인증 코드와 새 비밀번호를 받아 비밀번호를 변경합니다.",
        responses={
            200: OpenApiResponse(description="비밀번호 변경 성공"),
            400: OpenApiResponse(description="잘못된 코드 또는 유효성 검사 실패", examples=[EXAMPLE_400_BAD_REQUEST]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
        }
    )
    def post(self, request):
        from django.contrib.auth.models import User
        from ..models import PasswordResetToken
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        email = request.data.get('email', '').strip()
        code = request.data.get('code', '').strip()
        new_password = request.data.get('new_password', '')

        if not all([email, code, new_password]):
            return Response(
                {"error": str(ERROR_ALL_FIELDS_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": str(ERROR_INVALID_REQUEST)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 토큰 검증
        try:
            token = PasswordResetToken.objects.get(
                user=user,
                token=code,
                is_used=False
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": str(ERROR_INVALID_CODE)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if token.is_expired:
            return Response(
                {"error": str(ERROR_CODE_EXPIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 비밀번호 유효성 검사
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response(
                {"error": list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 비밀번호 변경
        user.set_password(new_password)
        user.save()

        # 토큰 사용 처리
        token.is_used = True
        token.save()

        return Response({
            "message": str(SUCCESS_PASSWORD_CHANGED_LOGIN)
        })


class FindUsernameView(APIView):
    """
    아이디 찾기 API
    이메일로 가입된 아이디 전송
    
    POST /api/username/find/
    
    Request Body:
        {
            "email": "user@example.com"
        }
    
    Response:
        {
            "message": "아이디 정보가 이메일로 전송되었습니다."
        }
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]  # 시간당 3회 제한

    @extend_schema(
        summary="아이디 찾기",
        description="가입된 이메일로 아이디(username) 정보를 전송합니다.",
        responses={
            200: OpenApiResponse(description="전송 성공"),
            400: OpenApiResponse(description="잘못된 요청", examples=[EXAMPLE_400_BAD_REQUEST]),
            429: OpenApiResponse(description="요청 한도 초과", examples=[EXAMPLE_429_THROTTLED]),
            500: OpenApiResponse(description="이메일 전송 실패", examples=[EXAMPLE_500_SERVER_ERROR]),
        }
    )
    def post(self, request):
        from django.contrib.auth.models import User
        from ..email_service import send_username_email

        email = request.data.get('email', '').strip()

        if not email:
            return Response(
                {"error": str(ERROR_EMAIL_REQUIRED)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # 보안: 이메일 존재 여부를 노출하지 않음
            return Response({
                "message": str(SUCCESS_USERNAME_SENT_IF_EXISTS)
            })

        email_sent = send_username_email(user)

        if email_sent:
            return Response({
                "message": str(SUCCESS_USERNAME_SENT)
            })
        else:
            return Response(
                {"error": str(ERROR_EMAIL_SEND_FAILED)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
