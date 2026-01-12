from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Diary
from .services.chat_service import ChatService
import threading

@receiver(post_save, sender=Diary)
def create_diary_embedding(sender, instance, created, **kwargs):
    """
    일기가 저장/수정될 때 비동기(스레드)로 임베딩 업데이트
    Docker 환경이나 Celery가 아닌 경우를 대비해 Threading 사용
    (프로덕션에서는 Celery 권장)
    """
    def _update():
        try:
            ChatService.update_diary_embedding(instance)
        except Exception as e:
            print(f"Error updating embedding for diary {instance.id}: {e}")

    # Main Thread 블로킹 방지를 위해 별도 스레드 실행
    threading.Thread(target=_update).start()
