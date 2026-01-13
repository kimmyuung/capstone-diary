from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from ..models import Diary

class ReportService:
    @staticmethod
    def get_period_report(user, period='week'):
        """주간/월간 리포트 데이터 생성"""
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
            user=user,
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
            'happy': '행복', 'sad': '슬픔', 'angry': '화남', 'anxious': '불안',
            'peaceful': '평온', 'excited': '신남', 'tired': '피곤', 'love': '사랑',
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
        
        # 가장 많은 감정 & AI 인사이트
        dominant_emotion = None
        insight = None
        if emotion_stats:
            top = emotion_stats[0]
            dominant_emotion = {
                'emotion': top['emotion'],
                'label': top['label'],
            }
            
            # AI 인사이트 생성 (DiarySummarizer 활용)
            try:
                from ..ai_service import DiarySummarizer
                summarizer = DiarySummarizer()
                insight = summarizer.generate_report_insight(diaries, period_label)
            except Exception:
                # AI 분석 실패 시 기본 멘트
                insight = f"이번 {period_label} 가장 많이 느낀 감정은 {top['label']}이에요."
                
        else:
            insight = f"이번 {period_label} 기록된 감정이 없어요. 일기를 작성해보세요!"
        
        return {
            'period': period,
            'period_label': period_label,
            'total_diaries': total_count,
            'data_sufficient': data_sufficient,
            'recommended_count': recommended_count,
            'emotion_stats': emotion_stats,
            'dominant_emotion': dominant_emotion,
            'insight': insight,
        }

    @staticmethod
    def get_calendar_data(user, year, month):
        """캘린더 데이터 생성"""
        # 해당 월의 일기 조회 (본인 것만!)
        diaries = Diary.objects.filter(
            user=user,
            created_at__year=year,
            created_at__month=month
        ).order_by('created_at')
        
        # 날짜별 요약 생성
        days = {}
        for diary in diaries:
            date_str = diary.created_at.strftime('%Y-%m-%d')
            if date_str not in days:
                days[date_str] = {
                    'count': 0,
                    'emotion': diary.emotion,
                    'emoji': diary.get_emotion_display_emoji() if diary.emotion else '',
                    'diary_ids': []
                }
            days[date_str]['count'] += 1
            days[date_str]['diary_ids'].append(diary.id)
            # 여러 일기가 있으면 마지막 일기의 감정 사용
            if diary.emotion:
                days[date_str]['emotion'] = diary.emotion
                days[date_str]['emoji'] = diary.get_emotion_display_emoji()
        
        return {
            'year': year,
            'month': month,
            'days': days
        }

    @staticmethod
    def get_annual_report(user, year):
        """연간 리포트 데이터 생성"""
        # 해당 연도의 일기 조회
        diaries = Diary.objects.filter(
            user=user,
            created_at__year=year
        )
        
        total_count = diaries.count()
        
        # 월별 통계
        monthly_stats = []
        for month in range(1, 13):
            month_diaries = diaries.filter(created_at__month=month)
            month_count = month_diaries.count()
            
            # 해당 월의 주요 감정
            dominant_emotion = None
            if month_count > 0:
                emotion_counts = month_diaries.filter(emotion__isnull=False).values('emotion').annotate(
                    count=Count('emotion')
                ).order_by('-count').first()
                if emotion_counts:
                    dominant_emotion = emotion_counts['emotion']
            
            monthly_stats.append({
                'month': month,
                'count': month_count,
                'dominant_emotion': dominant_emotion
            })
        
        # 연간 감정 통계
        emotion_labels = {
            'happy': '행복', 'sad': '슬픔', 'angry': '화남', 'anxious': '불안',
            'peaceful': '평온', 'excited': '신남', 'tired': '피곤', 'love': '사랑',
        }
        
        annual_emotions = diaries.filter(emotion__isnull=False).values('emotion').annotate(
            count=Count('emotion')
        ).order_by('-count')
        
        emotion_stats = []
        for item in annual_emotions:
            emotion = item['emotion']
            count = item['count']
            percentage = round((count / total_count) * 100) if total_count > 0 else 0
            emotion_stats.append({
                'emotion': emotion,
                'label': emotion_labels.get(emotion, emotion),
                'count': count,
                'percentage': percentage,
            })
        
        return {
            'year': year,
            'total_diaries': total_count,
            'monthly_stats': monthly_stats,
            'emotion_stats': emotion_stats,
        }
