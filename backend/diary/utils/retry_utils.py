"""
재시도 유틸리티
- AI API 호출용 재시도 정책
- 네트워크 오류용 재시도 정책
- 데이터베이스 오류용 재시도 정책
"""
import logging
from functools import wraps
from tenacity import (
    retry, stop_after_attempt, wait_exponential, wait_fixed,
    retry_if_exception_type, before_sleep_log, after_log
)
from google.api_core.exceptions import GoogleAPICallError, RetryError
import requests.exceptions

logger = logging.getLogger(__name__)


def log_retry_attempt(retry_state):
    """재시도 시 로그 출력"""
    exception = retry_state.outcome.exception()
    logger.warning(
        f"Retrying {retry_state.fn.__name__} "
        f"(Attempt {retry_state.attempt_number}/3) "
        f"due to: {type(exception).__name__}: {str(exception)[:100]}"
    )


def log_final_failure(retry_state):
    """최종 실패 시 로그 출력"""
    exception = retry_state.outcome.exception()
    logger.error(
        f"All retries failed for {retry_state.fn.__name__}: "
        f"{type(exception).__name__}: {str(exception)}"
    )


# ===== AI API 재시도 정책 =====
# Gemini, OpenAI 등 AI 서비스 호출용
# - 최대 3번 시도
# - 지수 백오프 (2초, 4초, 8초)
# - 일시적 오류에만 재시도
ai_retry_policy = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=10),
    retry=retry_if_exception_type((
        GoogleAPICallError,
        RetryError,
        requests.exceptions.Timeout,
        requests.exceptions.ConnectionError,
    )),
    before_sleep=log_retry_attempt,
    reraise=True
)


# ===== 네트워크 재시도 정책 =====
# 외부 API, 웹훅 등 네트워크 호출용
# - 최대 5번 시도
# - 고정 대기 (3초)
network_retry_policy = retry(
    stop=stop_after_attempt(5),
    wait=wait_fixed(3),
    retry=retry_if_exception_type((
        requests.exceptions.Timeout,
        requests.exceptions.ConnectionError,
        requests.exceptions.HTTPError,
    )),
    before_sleep=log_retry_attempt,
    reraise=True
)


# ===== 가벼운 재시도 정책 =====
# 빠른 실패가 필요한 경우
# - 최대 2번 시도
# - 짧은 대기 (1초)
light_retry_policy = retry(
    stop=stop_after_attempt(2),
    wait=wait_fixed(1),
    retry=retry_if_exception_type(Exception),
    before_sleep=log_retry_attempt,
    reraise=True
)


# ===== 데코레이터 헬퍼 =====
def with_retry(policy='ai'):
    """
    재시도 정책을 적용하는 데코레이터
    
    Usage:
        @with_retry('ai')
        def call_gemini_api():
            ...
        
        @with_retry('network')
        def send_webhook():
            ...
    """
    policies = {
        'ai': ai_retry_policy,
        'network': network_retry_policy,
        'light': light_retry_policy,
    }
    
    selected_policy = policies.get(policy, ai_retry_policy)
    
    def decorator(func):
        return selected_policy(func)
    
    return decorator


# ===== 컨텍스트 매니저 =====
class RetryContext:
    """
    재시도 로직을 수동으로 제어하기 위한 컨텍스트 매니저
    
    Usage:
        with RetryContext(max_attempts=3, delay=2) as ctx:
            while ctx.should_retry():
                try:
                    result = call_api()
                    ctx.success()
                    break
                except Exception as e:
                    ctx.failed(e)
    """
    
    def __init__(self, max_attempts=3, delay=2, exponential=True):
        self.max_attempts = max_attempts
        self.delay = delay
        self.exponential = exponential
        self.attempt = 0
        self.last_exception = None
        self._success = False
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self._success and self.last_exception:
            raise self.last_exception
        return False
    
    def should_retry(self):
        return self.attempt < self.max_attempts and not self._success
    
    def failed(self, exception):
        self.attempt += 1
        self.last_exception = exception
        
        if self.attempt < self.max_attempts:
            import time
            wait_time = self.delay * (2 ** (self.attempt - 1)) if self.exponential else self.delay
            logger.warning(f"Retry {self.attempt}/{self.max_attempts} after {wait_time}s")
            time.sleep(wait_time)
    
    def success(self):
        self._success = True

