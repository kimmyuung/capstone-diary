# backend/diary/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from .models import Diary, DiaryImage
from .serializers import DiarySerializer, DiaryImageSerializer
from .ai_service import ImageGenerator, SpeechToText

# TestConnectionView can be removed if no longer needed, but we'll keep it for now.
from rest_framework.views import APIView

class TestConnectionView(APIView):
    """
    React Native 앱의 연결을 테스트하기 위한 API 뷰입니다.
    """
    def get(self, request):
        return Response({
            "status": "success",
            "message": "Django 백엔드 연결 성공! React Native 앱이 API를 잘 호출했습니다.",
        })

class DiaryViewSet(viewsets.ModelViewSet):
    """
    일기(Diary) 항목에 대한 CRUD 및 AI 기능을 제공하는 ViewSet.
    """
    serializer_class = DiarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        요청한 사용자에 속한 일기 항목만 반환합니다.
        """
        return Diary.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """
        새로운 일기 항목을 생성할 때 현재 사용자를 자동으로 할당합니다.
        """
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='report')
    def report(self, request):
        """
        사용자의 감정 리포트를 반환합니다.
        
        Query Parameters:
            - period: 'week' (기본값) 또는 'month'
        
        Response:
            {
                "period": "week",
                "total_diaries": 5,
                "data_sufficient": true,
                "recommended_count": 7,
                "emotion_stats": [
                    {"emotion": "happy", "label": "행복", "count": 3, "percentage": 60},
                    ...
                ],
                "dominant_emotion": {"emotion": "happy", "label": "행복"},
                "insight": "이번 주 가장 많이 느낀 감정은 행복이에요."
            }
        """
        period = request.query_params.get('period', 'week')
        
        # 기간 설정
        now = timezone.now()
        if period == 'month':
            start_date = now - timedelta(days=30)
            period_label = '한 달'
            recommended_count = 15
        else:
            start_date = now - timedelta(days=7)
            period_label = '일주일'
            recommended_count = 7
        
        # 해당 기간 일기 조회
        diaries = Diary.objects.filter(
            user=request.user,
            created_at__gte=start_date,
            emotion__isnull=False
        )
        
        total_count = diaries.count()
        data_sufficient = total_count >= recommended_count
        
        # 감정별 통계
        emotion_counts = diaries.values('emotion').annotate(
            count=Count('emotion')
        ).order_by('-count')
        
        emotion_labels = {
            'happy': '행복',
            'sad': '슬픔',
            'angry': '화남',
            'anxious': '불안',
            'peaceful': '평온',
            'excited': '신남',
            'tired': '피곤',
            'love': '사랑',
        }
        
        emotion_stats = []
        for item in emotion_counts:
            emotion = item['emotion']
            count = item['count']
            percentage = round((count / total_count) * 100) if total_count > 0 else 0
            emotion_stats.append({
                'emotion': emotion,
                'label': emotion_labels.get(emotion, emotion),
                'count': count,
                'percentage': percentage,
            })
        
        # 가장 많은 감정
        dominant_emotion = None
        insight = None
        if emotion_stats:
            top = emotion_stats[0]
            dominant_emotion = {
                'emotion': top['emotion'],
                'label': top['label'],
            }
            insight = f"이번 {period_label} 가장 많이 느낀 감정은 {top['label']}이에요."
        else:
            insight = f"이번 {period_label} 기록된 감정이 없어요. 일기를 작성해보세요!"
        
        return Response({
            'period': period,
            'period_label': period_label,
            'total_diaries': total_count,
            'data_sufficient': data_sufficient,
            'recommended_count': recommended_count,
            'emotion_stats': emotion_stats,
            'dominant_emotion': dominant_emotion,
            'insight': insight,
        })

    @action(detail=True, methods=['post'], url_path='generate-image')
    def generate_image(self, request, pk=None):
        """
        특정 일기 항목에 대한 AI 이미지를 생성합니다.
        """
        diary = self.get_object()
        
        # Check if the user owns this diary
        if diary.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this diary.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            generator = ImageGenerator()
            result = generator.generate(diary.content)
            
            diary_image = DiaryImage.objects.create(
                diary=diary,
                image_url=result['url'],
                ai_prompt=result['prompt']
            )
            
            serializer = DiaryImageSerializer(diary_image)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TranscribeView(APIView):
    """
    음성을 텍스트로 변환하는 API 뷰입니다.
    Whisper API를 사용하여 100개 이상의 언어를 지원합니다.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        음성 파일을 텍스트로 변환합니다.
        
        Request:
            - audio: 오디오 파일 (mp3, mp4, mpeg, mpga, m4a, wav, webm)
            - language: 언어 코드 (선택, 기본값: 'ko')
                       빈 문자열이면 자동 감지
        
        Response:
            {
                "text": "변환된 텍스트",
                "language": "사용된 언어 코드"
            }
        """
        audio_file = request.FILES.get('audio')
        
        if not audio_file:
            return Response(
                {'error': '오디오 파일이 필요합니다. "audio" 필드로 파일을 업로드해주세요.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 지원되는 오디오 형식 확인
        allowed_extensions = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
        file_extension = audio_file.name.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            return Response(
                {'error': f'지원되지 않는 파일 형식입니다. 지원 형식: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 언어 파라미터 처리
        language = request.data.get('language', 'ko')
        if language == '':  # 빈 문자열이면 자동 감지
            language = None
        
        try:
            stt = SpeechToText()
            result = stt.transcribe(audio_file, language)
            
            return Response({
                'text': result['text'],
                'language': result['language']
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'음성 변환 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TranslateAudioView(APIView):
    """
    비영어 음성을 영어로 번역하는 API 뷰입니다.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        비영어 음성을 영어 텍스트로 번역합니다.
        
        Request:
            - audio: 오디오 파일
        
        Response:
            {
                "text": "영어로 번역된 텍스트",
                "original_language": "원본 언어 (자동 감지)"
            }
        """
        audio_file = request.FILES.get('audio')
        
        if not audio_file:
            return Response(
                {'error': '오디오 파일이 필요합니다. "audio" 필드로 파일을 업로드해주세요.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            stt = SpeechToText()
            result = stt.translate_to_english(audio_file)
            
            return Response({
                'text': result['text'],
                'original_language': result['original_language']
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'음성 번역 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportedLanguagesView(APIView):
    """
    음성-텍스트 변환에서 지원하는 언어 목록을 반환합니다.
    """
    
    def get(self, request):
        """
        지원되는 주요 언어 목록을 반환합니다.
        
        Response:
            {
                "languages": {"ko": "한국어", "en": "English", ...},
                "note": "Whisper는 100개 이상의 언어를 지원합니다..."
            }
        """
        return Response({
            'languages': SpeechToText.get_supported_languages(),
            'note': 'Whisper는 총 100개 이상의 언어를 지원합니다. 위 목록은 주요 언어입니다. language 파라미터를 비워두면 자동으로 언어를 감지합니다.'
        }, status=status.HTTP_200_OK)