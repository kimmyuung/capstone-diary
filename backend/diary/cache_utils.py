# diary/cache_utils.py
"""
캐시 유틸리티 함수
- 캐시 키 생성
- 캐시 무효화
"""
from django.core.cache import cache


def get_cache_key(prefix: str, user_id: int, *args) -> str:
    """
    캐시 키 생성
    
    Args:
        prefix: 캐시 유형 (report, calendar, heatmap 등)
        user_id: 사용자 ID
        *args: 추가 파라미터 (year, month, period 등)
    
    Returns:
        캐시 키 문자열
    """
    parts = [prefix, str(user_id)] + [str(arg) for arg in args if arg is not None]
    return ':'.join(parts)


def invalidate_user_cache(user_id: int):
    """
    사용자의 모든 관련 캐시 무효화
    일기 생성/수정/삭제 시 호출
    
    Args:
        user_id: 사용자 ID
    """
    from django.utils import timezone
    
    now = timezone.now()
    
    # 패턴 기반 삭제가 어려우므로 주요 캐시 키를 직접 삭제
    keys_to_delete = [
        # 리포트 캐시
        f"report:{user_id}:week",
        f"report:{user_id}:month",
        
        # 현재 연도 히트맵
        f"heatmap:{user_id}:{now.year}",
        
        # 현재 월 캘린더
        f"calendar:{user_id}:{now.year}:{now.month}",
        
        # 이전 달 캘린더 (월 경계 시점 대비)
        f"calendar:{user_id}:{now.year}:{now.month - 1}" if now.month > 1 else f"calendar:{user_id}:{now.year - 1}:12",
        
        # 인기 태그
        f"popular_tags:{user_id}",
    ]
    
    cache.delete_many(keys_to_delete)


def invalidate_report_cache(user_id: int):
    """리포트 캐시만 무효화"""
    cache.delete_many([
        f"report:{user_id}:week",
        f"report:{user_id}:month",
    ])


def invalidate_calendar_cache(user_id: int, year: int = None, month: int = None):
    """캘린더 캐시 무효화"""
    from django.utils import timezone
    
    if year and month:
        cache.delete(f"calendar:{user_id}:{year}:{month}")
    else:
        now = timezone.now()
        cache.delete(f"calendar:{user_id}:{now.year}:{now.month}")


def invalidate_heatmap_cache(user_id: int, year: int = None):
    """히트맵 캐시 무효화"""
    from django.utils import timezone
    
    if year:
        cache.delete(f"heatmap:{user_id}:{year}")
    else:
        now = timezone.now()
        cache.delete(f"heatmap:{user_id}:{now.year}")
