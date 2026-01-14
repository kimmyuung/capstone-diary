# config/celery.py
"""
Celery 설정 파일
비동기 태스크 처리를 위한 Celery 앱 설정
"""
import os
# Windows compatibility for Celery (Eventlet)
if os.name == 'nt':
    try:
        import eventlet
        eventlet.monkey_patch()
    except ImportError:
        pass

from celery import Celery

# Django 설정 모듈 지정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Celery 앱 생성
app = Celery('config')

# Django settings에서 CELERY_ 접두사로 시작하는 설정 로드
app.config_from_object('django.conf:settings', namespace='CELERY')

# 등록된 Django 앱에서 tasks.py 자동 검색
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """디버그용 태스크"""
    print(f'Request: {self.request!r}')


# =============================================================================
# Worker Process Init Signal (Eager Loading)
# =============================================================================
from celery.signals import worker_process_init

@worker_process_init.connect
def load_models_on_worker_init(**kwargs):
    """
    Celery 워커 프로세스가 시작될 때 무거운 AI 모델을 미리 로드합니다.
    (Singleton Pattern 적용)
    """
    from diary.services.analysis_service import get_sentence_transformer_model, logger
    
    logger.info("[Celery] Initializing worker process: Eagerly loading AI models...")
    try:
        # 모델 로드 함수 호출 (전역 변수에 저장됨)
        get_sentence_transformer_model()
        logger.info("[Celery] AI models loaded successfully.")
    except Exception as e:
        logger.error(f"[Celery] Failed to load AI models on worker init: {e}")
