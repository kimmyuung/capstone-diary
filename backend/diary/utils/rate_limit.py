"""
Rate Limiting 유틸리티
- 동시 작업 제한
- 일일 할당량 체크
- 작업 타입별 제한 관리
"""
import logging
from django.core.cache import cache
from django.utils import timezone
from rest_framework.exceptions import Throttled

logger = logging.getLogger(__name__)


class ConcurrentLimitError(Throttled):
    """동시 작업 제한 초과 에러"""
    default_detail = '다른 작업이 진행 중입니다. 완료 후 다시 시도해주세요.'
    default_code = 'concurrent_limit_exceeded'


class DailyQuotaExceededError(Throttled):
    """일일 할당량 초과 에러"""
    default_detail = '오늘의 할당량을 모두 사용했습니다.'
    default_code = 'daily_quota_exceeded'


def check_concurrent_limit(user_id, task_type='image_gen', max_concurrent=1):
    """
    동시 작업 제한 체크
    
    Args:
        user_id: 사용자 ID
        task_type: 작업 유형 (image_gen, emotion_analysis 등)
        max_concurrent: 최대 동시 작업 수
    
    Returns:
        tuple: (allowed: bool, message: str | None)
    """
    key = f"concurrent:{task_type}:{user_id}"
    current = cache.get(key, 0)
    
    if current >= max_concurrent:
        logger.warning(f"Concurrent limit exceeded for user {user_id}, task {task_type}")
        return False, f"다른 {_get_task_name(task_type)}이 진행 중입니다. 완료 후 다시 시도해주세요."
    
    return True, None


def acquire_concurrent_slot(user_id, task_type='image_gen', timeout=300):
    """
    동시 작업 슬롯 획득
    
    Args:
        user_id: 사용자 ID
        task_type: 작업 유형
        timeout: 슬롯 타임아웃 (초)
    
    Returns:
        bool: 슬롯 획득 성공 여부
    """
    key = f"concurrent:{task_type}:{user_id}"
    current = cache.get(key, 0)
    cache.set(key, current + 1, timeout=timeout)
    logger.debug(f"Acquired slot for user {user_id}, task {task_type}. Current: {current + 1}")
    return True


def release_concurrent_slot(user_id, task_type='image_gen'):
    """
    동시 작업 슬롯 해제
    
    Args:
        user_id: 사용자 ID
        task_type: 작업 유형
    """
    key = f"concurrent:{task_type}:{user_id}"
    current = cache.get(key, 0)
    if current > 0:
        cache.set(key, current - 1, timeout=300)
    logger.debug(f"Released slot for user {user_id}, task {task_type}. Current: {max(0, current - 1)}")


def check_daily_quota(user_id, task_type='image_gen', default_limit=2, premium_limit=10):
    """
    일일 할당량 체크
    
    Args:
        user_id: 사용자 ID
        task_type: 작업 유형
        default_limit: 기본 사용자 일일 한도
        premium_limit: 프리미엄 사용자 일일 한도
    
    Returns:
        tuple: (allowed: bool, remaining: int, limit: int)
    """
    from diary.models import UserPreference
    
    # 사용자 티어 확인
    try:
        pref = UserPreference.objects.get(user_id=user_id)
        is_premium = pref.is_premium
    except UserPreference.DoesNotExist:
        is_premium = False
    
    limit = premium_limit if is_premium else default_limit
    
    # 오늘 사용량 확인
    today = timezone.now().date().isoformat()
    key = f"quota:{task_type}:{user_id}:{today}"
    used = cache.get(key, 0)
    
    remaining = max(0, limit - used)
    allowed = remaining > 0
    
    if not allowed:
        logger.info(f"Daily quota exceeded for user {user_id}, task {task_type}. Used: {used}/{limit}")
    
    return allowed, remaining, limit


def increment_daily_usage(user_id, task_type='image_gen'):
    """
    일일 사용량 증가
    
    Args:
        user_id: 사용자 ID
        task_type: 작업 유형
    """
    today = timezone.now().date().isoformat()
    key = f"quota:{task_type}:{user_id}:{today}"
    
    try:
        cache.incr(key)
    except ValueError:
        # 키가 없으면 생성
        cache.set(key, 1, timeout=86400)  # 24시간


def _get_task_name(task_type):
    """작업 유형에 대한 한글 이름 반환"""
    names = {
        'image_gen': '이미지 생성',
        'emotion_analysis': '감정 분석',
        'summary': '요약 생성',
        'stt': '음성 인식',
    }
    return names.get(task_type, '작업')


class ConcurrentLimitContext:
    """
    컨텍스트 매니저로 동시 작업 제한 관리
    
    Usage:
        with ConcurrentLimitContext(user_id, 'image_gen'):
            # 작업 수행
            generate_image(...)
    """
    
    def __init__(self, user_id, task_type='image_gen', max_concurrent=1, timeout=300):
        self.user_id = user_id
        self.task_type = task_type
        self.max_concurrent = max_concurrent
        self.timeout = timeout
        self.slot_acquired = False
    
    def __enter__(self):
        allowed, message = check_concurrent_limit(
            self.user_id, self.task_type, self.max_concurrent
        )
        if not allowed:
            raise ConcurrentLimitError(detail=message)
        
        acquire_concurrent_slot(self.user_id, self.task_type, self.timeout)
        self.slot_acquired = True
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.slot_acquired:
            release_concurrent_slot(self.user_id, self.task_type)
        return False  # 예외를 다시 발생시킴
