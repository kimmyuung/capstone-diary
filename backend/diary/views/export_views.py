from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.http import HttpResponse
from diary.models import Diary, DiaryTag, UserPreference, DiaryTemplate
from diary.serializers import DiarySerializer, TagSerializer, UserPreferenceSerializer, DiaryTemplateSerializer
import json
import logging

logger = logging.getLogger(__name__)

class ExportViewSet(viewsets.ViewSet):
    """
    데이터 내보내기 및 가져오기 ViewSet
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='json')
    def export_json(self, request):
        """
        사용자의 모든 데이터를 JSON 형식으로 내보냅니다.
        """
        from ..services.export_service import ExportService
        try:
            data = ExportService.export_json(request.user)
            
            response = HttpResponse(
                json.dumps(data, ensure_ascii=False, indent=2),
                content_type='application/json'
            )
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f"diary_backup_{timestamp}.json"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"JSON export failed: {e}")
            return Response({"error": "Failed to export JSON"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='csv')
    def export_csv(self, request):
        """
        사용자의 모든 일기를 CSV 형식으로 내보냅니다.
        """
        from ..services.export_service import ExportService
        try:
            return ExportService.export_csv(request.user)
        except Exception as e:
            logger.error(f"CSV export failed: {e}")
            return Response({"error": "Failed to export CSV"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='pdf')
    def export_pdf(self, request):
        """
        사용자의 모든 일기를 PDF 파일로 내보냅니다.
        """
        from ..services.export_service import ExportService
        try:
            return ExportService.export_pdf(request.user)
        except Exception as e:
            logger.error(f"PDF export failed: {e}")
            return Response({"error": "Failed to export PDF"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='restore')
    def restore(self, request):
        """
        백업 파일에서 데이터 복원
        """
        user = request.user
        
        # 파일 또는 JSON 데이터 받기
        backup_file = request.FILES.get('file')
        backup_data = request.data.get('data')
        overwrite = str(request.data.get('overwrite', 'false')).lower() == 'true'
        
        if backup_file:
            try:
                import_data = json.loads(backup_file.read().decode('utf-8'))
            except json.JSONDecodeError:
                return Response({'error': '올바른 JSON 파일이 아닙니다.'}, status=status.HTTP_400_BAD_REQUEST)
        elif backup_data:
            import_data = backup_data
        else:
            return Response({'error': '복원할 데이터가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 메타데이터 검증
        if 'metadata' not in import_data or 'version' not in import_data.get('metadata', {}):
            return Response({'error': '올바른 백업 파일 형식이 아닙니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        restored_counts = {
            'diaries': 0,
            'tags': 0,
            'templates': 0
        }
        
        try:
            from django.db import transaction
            
            with transaction.atomic():
                # 1. 기존 데이터 삭제 (덮어쓰기 모드)
                if overwrite:
                    Diary.objects.filter(user=user).delete()
                    DiaryTag.objects.filter(user=user).delete()
                    DiaryTemplate.objects.filter(user=user).delete()
                
                # 2. 태그 복원
                for tag_data in import_data.get('tags', []):
                    DiaryTag.objects.get_or_create(
                        user=user,
                        name=tag_data.get('name'),
                        defaults={'color': tag_data.get('color', '#6C63FF')}
                    )
                    restored_counts['tags'] += 1
                
                # 3. 일기 복원
                for diary_data in import_data.get('diaries', []):
                    diary, created = Diary.objects.update_or_create(
                        user=user,
                        title=diary_data.get('title'),
                        created_at=diary_data.get('created_at'),
                        defaults={
                            'content': diary_data.get('content', ''),
                            'emotion': diary_data.get('emotion'),
                            'emotion_score': diary_data.get('emotion_score'),
                        }
                    )
                    if created:
                        restored_counts['diaries'] += 1
                
                # 4. 템플릿 복원
                for template_data in import_data.get('templates', []):
                    DiaryTemplate.objects.get_or_create(
                        user=user,
                        title=template_data.get('title'),
                        defaults={
                            'content': template_data.get('content', ''),
                            'categories': template_data.get('categories', []),
                        }
                    )
                    restored_counts['templates'] += 1
                
                # 5. 설정 복원
                pref_data = import_data.get('preferences', {})
                if pref_data:
                    UserPreference.objects.update_or_create(
                        user=user,
                        defaults={
                            'theme': pref_data.get('theme', 'light'),
                            'notification_enabled': pref_data.get('notification_enabled', True),
                            'reminder_time': pref_data.get('reminder_time'),
                        }
                    )
            
            return Response({
                'message': '데이터가 성공적으로 복원되었습니다.',
                'restored': restored_counts
            })
            
        except Exception as e:
            return Response({'error': f'복원 중 오류 발생: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


