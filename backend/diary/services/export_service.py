from django.utils import timezone
from django.conf import settings
from django.http import HttpResponse
import csv
import io
import os
import logging
from ..models import Diary, DiaryImage

logger = logging.getLogger('diary')

class ExportService:
    @staticmethod
    def export_json(user):
        """
        사용자의 모든 일기를 JSON 형식으로 내보냅니다.
        """
        diaries = Diary.objects.filter(user=user).order_by('created_at')
        
        result = []
        for diary in diaries:
            result.append({
                'id': diary.id,
                'title': diary.title,
                'content': diary.decrypt_content(), # Decrypt content here
                'emotion': diary.emotion,
                'emotion_score': diary.emotion_score,
                'location_name': diary.location_name,
                'latitude': diary.latitude,
                'longitude': diary.longitude,
                'created_at': diary.created_at.isoformat(),
                'updated_at': diary.updated_at.isoformat(),
            })
        
        return {
            'exported_at': timezone.now().isoformat(),
            'total_diaries': len(result),
            'diaries': result
        }

    @staticmethod
    def export_csv(user):
        """
        사용자의 모든 일기를 CSV 형식으로 내보냅니다.
        """
        diaries = Diary.objects.filter(user=user).order_by('created_at')
        
        # CSV 응답 생성 (View에서 처리할 수 있도록 HttpResponse 반환하거나, 컨텐츠만 반환할 수 있음)
        # 하지만 기존 로직이 HttpResponse를 반환하므로 여기서 생성하여 반환하는 것이 깔끔함.
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        filename = f"diary_export_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # BOM 추가 (Excel 호환성)
        response.write('\ufeff')
        
        writer = csv.writer(response)
        
        # 헤더 작성
        writer.writerow([
            'ID', '제목', '내용', '감정', '감정 점수',
            '위치명', '위도', '경도', '작성일', '수정일'
        ])
        
        # 데이터 작성
        for diary in diaries:
            writer.writerow([
                diary.id,
                diary.title,
                diary.decrypt_content(),
                diary.emotion or '',
                diary.emotion_score or '',
                diary.location_name or '',
                diary.latitude or '',
                diary.longitude or '',
                diary.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                diary.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            ])
        
        return response

    @staticmethod
    def export_pdf(user):
        """
        사용자의 모든 일기를 PDF 파일로 내보냅니다.
        """
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        diaries = Diary.objects.filter(user=user).order_by('-created_at')
        
        # PDF 버퍼 생성
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        # 스타일 설정
        styles = getSampleStyleSheet()
        
        # 폰트 등록 (한글 지원)
        # 폰트 파일 경로 확인 필요. 없으면 기본 폰트로 폴백하거나 시스템 폰트 사용
        # 여기서는 안전하게 예외처리
        font_name = 'Helvetica'
        try:
            # 기본 경로 가정 (프로젝트 루트나 static)
            # 실제 배포 환경에 맞춰 폰트 파일이 있어야 함.
            # 여기서는 예시로 'NanumGothic' 시도
            font_path = os.path.join(settings.BASE_DIR, 'static', 'fonts', 'NanumGothic.ttf')
            if os.path.exists(font_path):
                pdfmetrics.registerFont(TTFont('NanumGothic', font_path))
                font_name = 'NanumGothic'
            else:
                 # Windows 로컬 개발 환경 폰트 시도 (개발 편의성)
                 import platform
                 if platform.system() == 'Windows':
                     font_path = "C:\\Windows\\Fonts\\malgun.ttf"
                     if os.path.exists(font_path):
                         pdfmetrics.registerFont(TTFont('MalgunGothic', font_path))
                         font_name = 'MalgunGothic'
        except Exception as e:
            logger.warning(f"Font registration failed, using default: {e}")

        # 커스텀 스타일
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=font_name,
            fontSize=24,
            spaceAfter=30,
            alignment=1,  # 중앙 정렬
        )
        
        diary_title_style = ParagraphStyle(
            'DiaryTitle',
            parent=styles['Heading2'],
            fontName=font_name,
            fontSize=14,
            spaceBefore=20,
            spaceAfter=10,
        )
        
        content_style = ParagraphStyle(
            'Content',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=11,
            spaceAfter=10,
            leading=16,
        )
        
        date_style = ParagraphStyle(
            'DateStyle',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=9,
            textColor=colors.gray,
            spaceAfter=5,
        )
        
        # 문서 내용 구성
        elements = []
        
        # 제목
        elements.append(Paragraph("My Diary Export", title_style))
        elements.append(Paragraph(
            f"Exported on {timezone.now().strftime('%Y-%m-%d %H:%M')} | Total: {diaries.count()} entries",
            date_style
        ))
        elements.append(Spacer(1, 1*cm))
        
        # 감정 이모지 매핑
        emotion_map = {
            'happy': 'Happy', 'sad': 'Sad', 'angry': 'Angry',
            'anxious': 'Anxious', 'peaceful': 'Peaceful',
            'excited': 'Excited', 'tired': 'Tired', 'love': 'Love'
        }
        
        # 각 일기 추가
        for diary in diaries:
            # 날짜
            date_str = diary.created_at.strftime('%Y-%m-%d %H:%M')
            emotion_str = emotion_map.get(diary.emotion, '') if diary.emotion else ''
            location_str = f" | Location: {diary.location_name}" if diary.location_name else ""
            
            elements.append(Paragraph(
                f"{date_str} | {emotion_str}{location_str}",
                date_style
            ))
            
            # 제목
            safe_title = (diary.title or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            elements.append(Paragraph(safe_title, diary_title_style))
            
            # 내용
            content = diary.decrypt_content() or ''
            safe_content = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            safe_content = safe_content.replace('\n', '<br/>')
            elements.append(Paragraph(safe_content, content_style))
            
            # 구분선
            elements.append(Spacer(1, 0.5*cm))
        
        # PDF 생성
        doc.build(elements)
        
        # 응답 생성
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        filename = f"diary_export_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
