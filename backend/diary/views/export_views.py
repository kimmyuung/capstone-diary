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
