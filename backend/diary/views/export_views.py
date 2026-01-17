from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.http import HttpResponse
from diary.models import Diary, DiaryTag, UserPreference, DiaryTemplate
from diary.serializers import DiarySerializer, TagSerializer, UserPreferenceSerializer, DiaryTemplateSerializer
import json

class DataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. 일기 데이터
        diaries = Diary.objects.filter(user=user).order_by('created_at')
        diary_data = DiarySerializer(diaries, many=True).data
        
        # 2. 태그 데이터
        tags = DiaryTag.objects.filter(user=user)
        tag_data = TagSerializer(tags, many=True).data
        
        # 3. 사용자 설정
        try:
            pref = UserPreference.objects.get(user=user)
            pref_data = UserPreferenceSerializer(pref).data
        except UserPreference.DoesNotExist:
            pref_data = {}
            
        # 4. 사용자 템플릿
        templates = DiaryTemplate.objects.filter(user=user)
        template_data = DiaryTemplateSerializer(templates, many=True).data
        
        # 전체 데이터 구상
        export_data = {
            'metadata': {
                'username': user.username,
                'email': user.email,
                'export_date': timezone.now().isoformat(),
                'version': '1.0'
            },
            'diaries': diary_data,
            'tags': tag_data,
            'preferences': pref_data,
            'templates': template_data
        }
        
        # JSON 응답 생성 (파일 다운로드)
        response = HttpResponse(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            content_type='application/json'
        )
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"diary_backup_{timestamp}.json"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response


class DataRestoreView(APIView):
    """
    백업 파일에서 데이터 복원
    POST /api/restore/
    - 업로드된 JSON 백업 파일을 파싱하여 데이터 복원
    - 기존 데이터 덮어쓰기 옵션 지원
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # 파일 또는 JSON 데이터 받기
        backup_file = request.FILES.get('file')
        backup_data = request.data.get('data')
        overwrite = request.data.get('overwrite', False)
        
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

