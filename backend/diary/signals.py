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
    from django.conf import settings
    
    if getattr(settings, 'IS_TESTING', False):
        print("DEBUG: Running signal synchronously")
        _update()
    else:
        print("DEBUG: Running signal in thread")
        threading.Thread(target=_update).start()

@receiver(post_save, sender=Diary)
def trigger_stt(sender, instance, created, **kwargs):
    """
    voice_file이 있고 transcription이 없을 때 STT 실행
    """
    if instance.voice_file and not instance.transcription and not instance.is_transcribing:
        def _transcribe():
            try:
                # 상태 업데이트: 변환 중
                instance.is_transcribing = True
                instance.save(update_fields=['is_transcribing'])
                
                from .services.stt_service import STTService
                stt_service = STTService()
                text = stt_service.transcribe(instance.voice_file)
                
                if text:
                    instance.transcription = text
                    # 음성 일기인 경우, 본문이 비어있으면 채워넣기 (선택 사항)
                    if not instance.content:
                        instance.encrypt_content(text)
                
                instance.is_transcribing = False
                instance.save(update_fields=['transcription', 'is_transcribing', 'content', 'is_encrypted'])
                
            except Exception as e:
                print(f"Error transcribing diary {instance.id}: {e}")
                instance.is_transcribing = False
                instance.save(update_fields=['is_transcribing'])

        # 테스트 환경 체크
        from django.conf import settings
        if getattr(settings, 'IS_TESTING', False):
            _transcribe()
        else:
            threading.Thread(target=_transcribe).start()
