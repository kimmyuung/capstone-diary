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

@receiver(post_save, sender=Diary)
def auto_generate_tags(sender, instance, created, **kwargs):
    """
    일기 저장 시 자동으로 키워드를 추출하여 태그로 저장
    (검색 성능 최적화를 위한 Plaintext Index 역할)
    """
    # 1. 내용이 없거나 암호화되지 않은 경우(별도 처리 필요 시) 체크
    # decrypt_content()는 내부적으로 복호화 캐싱을 하지 않으므로, 
    # 여기서 호출하면 매번 복호화 연산이 발생하지만, 비동기 스레드이므로 괜찮음.
    
    def _update_tags():
        try:
            from .ai_service import KeywordExtractor
            from .models import Tag, DiaryTag
            
            # 복호화된 내용 가져오기
            content = instance.decrypt_content()
            if not content or len(content) < 10:
                return

            # 키워드 추출
            extractor = KeywordExtractor()
            keywords = extractor.extract_keywords(content, top_n=5)
            
            if not keywords:
                return
                
            # 기존 자동 생성 태그 정리 (선택 사항: 사용자가 수동으로 단 태그와 구분이 필요할 수 있음)
            # 여기서는 단순히 기존 태그를 유지하고 추가하거나, 
            # 중복 방지 로직만 넣음. 
            # (만약 '자동 태그'만 리셋하고 싶다면 별도 플래그가 필요하지만, 
            # 현재는 단순하게 키워드가 있으면 태그로 등록하는 로직만 수행)
            
            for keyword in keywords:
                # 태그 생성 또는 조회
                tag, _ = Tag.objects.get_or_create(
                    user=instance.user,
                    name=keyword,
                    defaults={'color': '#6366F1'} # 기본 색상
                )
                
                # 일기-태그 연결
                DiaryTag.objects.get_or_create(diary=instance, tag=tag)
                
            print(f"DEBUG: Auto-tagged diary {instance.id} with {keywords}")

        except Exception as e:
            print(f"Error auto-tagging diary {instance.id}: {e}")

    # Main Thread 블로킹 방지
    from django.conf import settings
    if getattr(settings, 'IS_TESTING', False):
        _update_tags()
    else:
        threading.Thread(target=_update_tags).start()
