"""
구조화된 로깅 설정

JSON 형식 로깅 및 요청별 Correlation ID 지원
"""
import logging
import json
import uuid
from datetime import datetime
from typing import Optional
import threading

# Thread-local storage for request context
_request_context = threading.local()


def set_correlation_id(correlation_id: str = None):
    """현재 요청의 Correlation ID 설정"""
    _request_context.correlation_id = correlation_id or str(uuid.uuid4())[:8]


def get_correlation_id() -> str:
    """현재 요청의 Correlation ID 반환"""
    return getattr(_request_context, 'correlation_id', 'no-request')


class StructuredLogFormatter(logging.Formatter):
    """
    JSON 형식의 구조화된 로그 포맷터
    
    Output Example:
    {"timestamp": "2024-01-01T12:00:00", "level": "INFO", "logger": "diary.views", 
     "message": "Diary created", "correlation_id": "abc123", "extra": {...}}
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }
        
        # 파일/라인 정보 추가
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 추가 필드 처리
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ('name', 'msg', 'args', 'created', 'filename', 'funcName',
                          'levelname', 'levelno', 'lineno', 'module', 'msecs',
                          'pathname', 'process', 'processName', 'relativeCreated',
                          'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                          'message', 'asctime'):
                try:
                    json.dumps(value)  # JSON 직렬화 가능한지 확인
                    extra_fields[key] = value
                except (TypeError, ValueError):
                    extra_fields[key] = str(value)
        
        if extra_fields:
            log_data["extra"] = extra_fields
        
        return json.dumps(log_data, ensure_ascii=False)


class CorrelationIdMiddleware:
    """
    요청별 Correlation ID를 설정하는 미들웨어
    
    X-Correlation-ID 헤더가 있으면 사용, 없으면 자동 생성
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # 헤더에서 Correlation ID 가져오거나 생성
        correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4())[:8])
        set_correlation_id(correlation_id)
        
        response = self.get_response(request)
        
        # 응답 헤더에 Correlation ID 추가
        response['X-Correlation-ID'] = correlation_id
        
        return response


def get_structured_logging_config(log_level: str = 'INFO') -> dict:
    """
    Django LOGGING 설정용 구조화된 로깅 설정 반환
    
    Usage in settings.py:
        from diary.utils.structured_logging import get_structured_logging_config
        LOGGING = get_structured_logging_config()
    """
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'structured': {
                '()': StructuredLogFormatter,
            },
            'simple': {
                'format': '[{levelname}] {name}: {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'simple',  # 개발 환경에서는 simple
            },
            'file': {
                'class': 'logging.FileHandler',
                'filename': 'debug.log',
                'formatter': 'simple',
            },
            'structured_file': {
                'class': 'logging.FileHandler',
                'filename': 'structured.log',
                'formatter': 'structured',  # 프로덕션용 JSON 로그
            },
        },
        'loggers': {
            'diary': {
                'handlers': ['console', 'file'],
                'level': log_level,
                'propagate': False,
            },
            'django': {
                'handlers': ['console'],
                'level': 'WARNING',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    }
