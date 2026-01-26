# diary/middleware.py
import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.urls import resolve
from .models import AuditLog

logger = logging.getLogger(__name__)

class AuditLogMiddleware(MiddlewareMixin):
    """
    민감한 작업에 대한 감사 로그를 기록하는 미들웨어
    """
    
    # 로깅할 HTTP 메서드 및 매핑
    METHOD_MAP = {
        'GET': 'READ',
        'POST': 'CREATE',
        'PUT': 'UPDATE',
        'PATCH': 'UPDATE',
        'DELETE': 'DELETE',
    }
    
    # 로깅할 주요 경로 (민감한 데이터)
    SENSITIVE_PATHS = [
        '/api/diaries/',
        '/api/reports/',
        '/api/gallery/',
        '/api/export/',
        '/api/admin/',
    ]
    
    def process_response(self, request, response):
        """응답 처리 후 로깅 수행"""
        # 1. 인증된 사용자만 로깅 (로그인은 예외)
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            # TODO: 로그인 실패 로깅은 별도 시그널로 처리 권장
            return response

        # 2. 경로 필터링
        path = request.path
        if not any(path.startswith(prefix) for prefix in self.SENSITIVE_PATHS):
            return response
            
        # 3. 메서드 필터링
        method = request.method
        action = self.METHOD_MAP.get(method)
        if not action:
            return response
            
        # GET 요청은 상세 페이지나 리포트 조회만 로깅 (목록 조회 과다 로깅 방지)
        # if method == 'GET' and not path.endswith('/'): # 단순 목록은 제외 등 정책 필요
        #    pass 

        try:
            # 클라이언트 IP 추출
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            
            # 리소스 식별
            # /api/diaries/123/ -> Diary:123
            resource = path
            resolver_match = resolve(path)
            if resolver_match:
                view_name = resolver_match.view_name
                kwargs = resolver_match.kwargs
                if kwargs:
                    resource = f"{view_name}:{json.dumps(kwargs)}"
                else:
                    resource = view_name
            
            # 상태
            status = 'SUCCESS' if 200 <= response.status_code < 400 else 'FAILURE'
            
            # 비동기로 로그 저장 (DB 부하 고려)
            # 여기서는 편의상 동기 저장. Celery Task로 위임 권장.
            AuditLog.objects.create(
                user=request.user,
                action=action,
                resource=resource[:100],
                ip_address=ip,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                status=status,
                details={
                    'method': method,
                    'path': path,
                    'status_code': response.status_code
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            
        return response
