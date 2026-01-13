# diary/tasks.py
"""
Celery 비동기 태스크
- 이메일 발송
- PDF 생성
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger('diary')


# =============================================================================
# 이메일 발송 태스크
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_async(self, subject: str, message: str, recipient_email: str):
    """
    비동기 이메일 발송
    
    Args:
        subject: 이메일 제목
        message: 이메일 본문
        recipient_email: 수신자 이메일
        
    Returns:
        bool: 성공 여부
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER or 'noreply@emotionaldiary.com',
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"[Celery] Email sent to {recipient_email}")
        return True
    except Exception as exc:
        logger.error(f"[Celery] Failed to send email to {recipient_email}: {exc}")
        # 재시도
        raise self.retry(exc=exc)


@shared_task
def send_verification_email_async(username: str, email: str, token: str):
    """이메일 인증 코드 발송"""
    subject = '[감성 일기] 이메일 인증 코드'
    message = f"""
안녕하세요, {username}님!

감성 일기에 가입해 주셔서 감사합니다.
아래 인증 코드를 입력하여 이메일 인증을 완료해주세요:

━━━━━━━━━━━━━━━━━━━━
   인증 코드: {token}
━━━━━━━━━━━━━━━━━━━━

⏰ 이 코드는 10분 후에 만료됩니다.

본인이 가입을 요청하지 않았다면 이 이메일을 무시해주세요.

감사합니다,
감성 일기 팀
"""
    return send_email_async.delay(subject, message, email)


@shared_task
def send_password_reset_email_async(username: str, email: str, token: str):
    """비밀번호 재설정 인증 코드 발송"""
    subject = '[감성 일기] 비밀번호 재설정 인증 코드'
    message = f"""
안녕하세요, {username}님!

비밀번호 재설정을 요청하셨습니다.
아래 인증 코드를 입력해주세요:

━━━━━━━━━━━━━━━━━━━━
   인증 코드: {token}
━━━━━━━━━━━━━━━━━━━━

⏰ 이 코드는 30분 후에 만료됩니다.

본인이 요청하지 않았다면 이 이메일을 무시해주세요.
계정은 안전하게 보호되고 있습니다.

감사합니다,
감성 일기 팀
"""
    return send_email_async.delay(subject, message, email)


@shared_task
def send_username_email_async(username: str, email: str):
    """아이디 찾기 이메일 발송"""
    # 아이디 일부 마스킹
    if len(username) > 4:
        masked = username[:2] + '*' * (len(username) - 4) + username[-2:]
    else:
        masked = username[0] + '*' * (len(username) - 1)
    
    subject = '[감성 일기] 아이디 찾기 결과'
    message = f"""
안녕하세요!

요청하신 아이디 찾기 결과입니다.

━━━━━━━━━━━━━━━━━━━━
   가입된 아이디: {masked}
━━━━━━━━━━━━━━━━━━━━

전체 아이디: {username}

이제 이 아이디로 로그인하실 수 있습니다.
비밀번호가 기억나지 않으신다면 '비밀번호 찾기'를 이용해주세요.

감사합니다,
감성 일기 팀
"""
    return send_email_async.delay(subject, message, email)


# =============================================================================
# PDF 생성 태스크
# =============================================================================

@shared_task(bind=True, max_retries=2)
def generate_pdf_async(self, user_id: int, diary_ids: list, filename: str):
    """
    비동기 PDF 생성
    
    Args:
        user_id: 사용자 ID
        diary_ids: 일기 ID 리스트
        filename: 저장할 파일명
        
    Returns:
        str: 생성된 파일 경로
    """
    from django.contrib.auth import get_user_model
    from .models import Diary
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib import colors
    import os
    import io
    
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        diaries = Diary.objects.filter(id__in=diary_ids, user=user).order_by('-created_at')
        
        if not diaries.exists():
            logger.warning(f"[Celery] No diaries found for PDF generation")
            return None
        
        # PDF 생성
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # 폰트 설정 (한글 지원)
        try:
            pdfmetrics.registerFont(TTFont('NanumGothic', 'NanumGothic.ttf'))
            font_name = 'NanumGothic'
        except:
            font_name = 'Helvetica'
        
        y_position = height - 50
        
        for diary in diaries:
            # 새 페이지 필요 체크
            if y_position < 100:
                p.showPage()
                y_position = height - 50
            
            # 제목
            p.setFont(font_name, 14)
            p.drawString(50, y_position, diary.title)
            y_position -= 20
            
            # 날짜
            p.setFont(font_name, 10)
            p.setFillColor(colors.gray)
            p.drawString(50, y_position, diary.created_at.strftime('%Y년 %m월 %d일'))
            y_position -= 25
            
            # 감정
            if diary.emotion:
                p.drawString(50, y_position, f"감정: {diary.emotion_emoji or ''} {diary.emotion}")
                y_position -= 20
            
            # 내용
            p.setFillColor(colors.black)
            p.setFont(font_name, 11)
            content = diary.get_decrypted_content() or diary.content
            
            # 줄바꿈 처리
            lines = content.split('\n')
            for line in lines[:20]:  # 최대 20줄
                if y_position < 50:
                    p.showPage()
                    y_position = height - 50
                p.drawString(50, y_position, line[:80])  # 80자 제한
                y_position -= 15
            
            y_position -= 30  # 일기 간격
        
        p.save()
        
        # 파일 저장
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'exports')
        os.makedirs(pdf_dir, exist_ok=True)
        
        filepath = os.path.join(pdf_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(buffer.getvalue())
        
        logger.info(f"[Celery] PDF generated: {filepath}")
        return filepath
        
    except Exception as exc:
        logger.error(f"[Celery] PDF generation failed: {exc}")
        raise self.retry(exc=exc)


@shared_task
def cleanup_old_exports(days: int = 7):
    """오래된 내보내기 파일 정리"""
    import os
    from datetime import datetime, timedelta
    
    export_dir = os.path.join(settings.MEDIA_ROOT, 'exports')
    if not os.path.exists(export_dir):
        return 0
    
    cutoff = datetime.now() - timedelta(days=days)
    deleted = 0
    
    for filename in os.listdir(export_dir):
        filepath = os.path.join(export_dir, filename)
        if os.path.isfile(filepath):
            file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
            if file_time < cutoff:
                os.remove(filepath)
                deleted += 1
    
    logger.info(f"[Celery] Cleaned up {deleted} old export files")
    return deleted


# =============================================================================
# AI 작업 태스크 (이미지, 키워드, 요약)
# =============================================================================

@shared_task
def generate_image_task(diary_id: int):
    """일기 이미지 생성 태스크"""
    from .models import Diary
    from .services.image_service import ImageGenerator
    
    try:
        diary = Diary.objects.get(id=diary_id)
        # 이미지가 이미 있는지 확인
        if diary.images.exists():
            return "Image already exists"
            
        generator = ImageGenerator()
        image_url = generator.generate(diary.decrypt_content(), emotion=diary.emotion)['url']
        # Note: generator.generate now returns dict {'url': ..., 'prompt': ...}
        
        if image_url:
            return f"Image generated for diary {diary_id}"
        return f"Image generation failed for diary {diary_id}"
    except Exception as e:
        logger.error(f"[Celery] Image generation failed: {e}")
        return str(e)

@shared_task
def extract_keywords_task(diary_id: int):
    """키워드 추출 및 태그 저장 태스크 (Auto-tagging)"""
    from .models import Diary, Tag, DiaryTag
    from .services.analysis_service import KeywordExtractor
    
    try:
        diary = Diary.objects.get(id=diary_id)
        content = diary.decrypt_content()
        if not content or len(content) < 10:
            return "Content too short"
            
        extractor = KeywordExtractor()
        keywords = extractor.extract_keywords(content, top_n=5)
        
        if not keywords:
            return "No keywords found"
            
        for keyword in keywords:
            tag, _ = Tag.objects.get_or_create(
                user=diary.user,
                name=keyword,
                defaults={'color': '#6366F1'}
            )
            DiaryTag.objects.get_or_create(diary=diary, tag=tag)
            
        logger.info(f"[Celery] Auto-tagged diary {diary_id} with {keywords}")
        return keywords
    except Exception as e:
        logger.error(f"[Celery] Auto-tagging failed: {e}")
        return str(e)


@shared_task
def reindex_vectors():
    """
    주기적 벡터 인덱스 재빌드 (Reindexing)
    - pgvector HNSW 인덱스는 데이터 추가/삭제가 반복되면 효율이 떨어질 수 있음
    - 저부하 시간대(새벽)에 수행 권장
    """
    from django.db import connection, transaction
    
    logger.info("[Celery] Starting incremental vector reindexing...")
    
    # SQLite에서는 HnswIndex가 없거나 동작이 다르므로 스킵
    if connection.vendor != 'postgresql':
        logger.info("[Celery] Skipping reindexing (Not PostgreSQL)")
        return "Skipped (Not PostgreSQL)"
        
    try:
        with connection.cursor() as cursor:
            # 1. DiaryEmbedding 인덱스 재빌드
            # CONCURRENTLY 옵션은 인덱스 종류에 따라 지원 여부가 다름 (pgvector 0.5+ 지원 시도)
            # 여기서는 안전하게 일반 REINDEX 사용 (락 걸릴 수 있으므로 새벽 실행 필수)
            cursor.execute("REINDEX INDEX CONCURRENTLY diary_vector_idx;")
            logger.info("[Celery] Reindexed diary_vector_idx")
            
            # 2. DiarySummary 인덱스 재빌드
            cursor.execute("REINDEX INDEX CONCURRENTLY summary_vector_idx;")
            logger.info("[Celery] Reindexed summary_vector_idx")
            
        return "Reindexing completed"
    except Exception as e:
        logger.error(f"[Celery] Reindexing failed: {e}")
        return str(e)
