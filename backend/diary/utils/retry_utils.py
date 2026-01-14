import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google.api_core.exceptions import GoogleAPICallError, RetryError

logger = logging.getLogger(__name__)

def log_retry_attempt(retry_state):
    """재시도 시 로그 출력"""
    logger.warning(
        f"Retrying {retry_state.fn.__name__} due to {retry_state.outcome.exception()} "
        f"(Attempt {retry_state.attempt_number})"
    )

# 공통 재시도 설정
# 1. 최대 3번 시도
# 2. 지수 백오프 (2초, 4초, 8초 ...)
# 3. Google API 관련 에러 발생 시에만 재시도
ai_retry_policy = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=10),
    retry=retry_if_exception_type((GoogleAPICallError, RetryError, Exception)), # 일반 Exception도 포함할지 고려 (네트워크 등)
    before_sleep=log_retry_attempt,
    reraise=True
)
