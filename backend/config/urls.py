from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from diary.views import (
    TestConnectionView, TranscribeView, TranslateAudioView, SupportedLanguagesView,
    RegisterView, PasswordResetRequestView, PasswordResetConfirmView, FindUsernameView,
    EmailVerifyView, ResendVerificationView, PushTokenView, CustomTokenObtainPairView
)
from diary.views.export_views import DataExportView
from diary.views.chat_views import ChatAIView
from diary.views.social_auth_views import GoogleLoginView, KakaoLoginView
from config.healthcheck import HealthCheckView, SentryTestView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API 문서 (drf-spectacular)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # 헬스체크 (모니터링용)
    path('api/health/', HealthCheckView.as_view(), name='health_check'),
    path('api/sentry-test/', SentryTestView.as_view(), name='sentry_test'),
    
    # 인증 (회원가입 + 이메일 인증)
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/email/verify/', EmailVerifyView.as_view(), name='email_verify'),
    path('api/email/resend/', ResendVerificationView.as_view(), name='email_resend'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 소셜 로그인
    path('api/auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('api/auth/kakao/', KakaoLoginView.as_view(), name='kakao_login'),
    
    # 비밀번호/아이디 찾기
    path('api/password/reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/password/reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('api/username/find/', FindUsernameView.as_view(), name='find_username'),
    
    # 테스트 엔드포인트
    path('api/test/connection/', TestConnectionView.as_view(), name='test_connection'),
    
    # 데이터 내보내기 (백업)
    path('api/export/data/', DataExportView.as_view(), name='data_export'),
    
    # AI 채팅
    path('api/chat/', ChatAIView.as_view(), name='chat_ai'),
    
    # 음성-텍스트 변환 API (Whisper) - 100개 이상 언어 지원
    path('api/transcribe/', TranscribeView.as_view(), name='transcribe'),
    path('api/translate-audio/', TranslateAudioView.as_view(), name='translate_audio'),
    path('api/supported-languages/', SupportedLanguagesView.as_view(), name='supported_languages'),
    
    # 푸시 알림 토큰 관리
    path('api/push-token/', PushTokenView.as_view(), name='push_token'),
    
    # 일기 API - v1 (버전 관리)
    path('api/v1/', include('diary.urls')),
    # 일기 API - 하위 호환성을 위한 기존 경로 유지
    path('api/', include('diary.urls')),
    
    # Prometheus Metrics (모니터링)
    path('', include('django_prometheus.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
