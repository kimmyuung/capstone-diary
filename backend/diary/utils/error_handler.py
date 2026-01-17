"""
표준 에러 응답 핸들러
- 일관된 에러 응답 포맷
- 에러 코드 표준화
- 클라이언트 친화적 메시지
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import (
    APIException, ValidationError, AuthenticationFailed,
    NotAuthenticated, PermissionDenied, NotFound, Throttled
)

logger = logging.getLogger(__name__)


# 에러 코드 상수
class ErrorCode:
    # 인증 관련
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED'
    NOT_AUTHENTICATED = 'NOT_AUTHENTICATED'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    
    # 검증 관련
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    INVALID_INPUT = 'INVALID_INPUT'
    
    # 리소스 관련
    NOT_FOUND = 'NOT_FOUND'
    CONFLICT = 'CONFLICT'
    
    # 제한 관련
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
    CONCURRENT_LIMIT = 'CONCURRENT_LIMIT'
    
    # 서버 관련
    INTERNAL_ERROR = 'INTERNAL_ERROR'
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
    AI_SERVICE_ERROR = 'AI_SERVICE_ERROR'


def custom_exception_handler(exc, context):
    """
    DRF 커스텀 예외 핸들러
    모든 에러 응답을 표준 포맷으로 변환
    
    표준 응답 포맷:
    {
        "error": "ERROR_CODE",
        "message": "사용자 친화적 메시지",
        "details": {}  # 선택적 - 필드별 에러 등
    }
    """
    # 기본 핸들러 호출
    response = exception_handler(exc, context)
    
    if response is None:
        # DRF가 처리하지 못한 예외
        if isinstance(exc, DjangoValidationError):
            return Response(
                {
                    'error': ErrorCode.VALIDATION_ERROR,
                    'message': '입력 값이 올바르지 않습니다.',
                    'details': {'errors': list(exc.messages)}
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 예상치 못한 서버 에러
        logger.exception(f"Unhandled exception: {exc}")
        return Response(
            {
                'error': ErrorCode.INTERNAL_ERROR,
                'message': '서버에서 예기치 않은 오류가 발생했습니다.',
                'details': {}
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # 표준 포맷으로 변환
    error_code = _get_error_code(exc)
    message = _get_user_message(exc, response)
    details = _get_error_details(exc, response)
    
    response.data = {
        'error': error_code,
        'message': message,
        'details': details
    }
    
    return response


def _get_error_code(exc):
    """예외 타입에 따른 에러 코드 반환"""
    error_map = {
        AuthenticationFailed: ErrorCode.AUTHENTICATION_FAILED,
        NotAuthenticated: ErrorCode.NOT_AUTHENTICATED,
        PermissionDenied: ErrorCode.PERMISSION_DENIED,
        ValidationError: ErrorCode.VALIDATION_ERROR,
        NotFound: ErrorCode.NOT_FOUND,
        Throttled: ErrorCode.RATE_LIMIT_EXCEEDED,
    }
    
    # 커스텀 에러 코드가 있으면 사용
    if hasattr(exc, 'default_code'):
        code = exc.default_code
        if code == 'concurrent_limit_exceeded':
            return ErrorCode.CONCURRENT_LIMIT
        if code == 'daily_quota_exceeded':
            return ErrorCode.QUOTA_EXCEEDED
        if code == 'conflict':
            return ErrorCode.CONFLICT
    
    for exc_type, code in error_map.items():
        if isinstance(exc, exc_type):
            return code
    
    return ErrorCode.INTERNAL_ERROR


def _get_user_message(exc, response):
    """사용자 친화적 메시지 생성"""
    # 커스텀 메시지가 있으면 사용
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, str):
            return exc.detail
        if isinstance(exc.detail, dict) and 'message' in exc.detail:
            return exc.detail['message']
    
    # 상태 코드별 기본 메시지
    status_messages = {
        400: '요청이 올바르지 않습니다.',
        401: '로그인이 필요합니다.',
        403: '접근 권한이 없습니다.',
        404: '요청한 리소스를 찾을 수 없습니다.',
        409: '데이터 충돌이 발생했습니다.',
        429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        500: '서버 오류가 발생했습니다.',
        503: '서비스가 일시적으로 이용 불가합니다.',
    }
    
    return status_messages.get(response.status_code, '오류가 발생했습니다.')


def _get_error_details(exc, response):
    """에러 상세 정보 추출"""
    details = {}
    
    if isinstance(exc, ValidationError):
        if isinstance(exc.detail, dict):
            # 필드별 에러
            details['fields'] = {}
            for field, errors in exc.detail.items():
                if isinstance(errors, list):
                    details['fields'][field] = [str(e) for e in errors]
                else:
                    details['fields'][field] = [str(errors)]
        elif isinstance(exc.detail, list):
            details['errors'] = [str(e) for e in exc.detail]
    
    if isinstance(exc, Throttled):
        if exc.wait:
            details['retry_after'] = int(exc.wait)
    
    return details


# 커스텀 API 예외 클래스들
class AIServiceError(APIException):
    """AI 서비스 관련 에러"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'AI 서비스가 일시적으로 이용 불가합니다.'
    default_code = 'ai_service_error'


class ConflictError(APIException):
    """데이터 충돌 에러 (Optimistic Locking)"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = '데이터가 다른 곳에서 수정되었습니다.'
    default_code = 'conflict'


class QuotaExceededError(APIException):
    """할당량 초과 에러"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = '오늘의 할당량을 모두 사용했습니다.'
    default_code = 'quota_exceeded'
