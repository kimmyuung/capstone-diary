from django.utils import timezone
from ..models import UserPreference, DiaryImage, Diary
from datetime import date

class UserTierService:
    @staticmethod
    def check_image_generation_limit(user):
        """
        Check if the user has reached their daily image generation limit.
        Returns:
            tuple: (is_allowed: bool, details: dict)
        """
        today = timezone.now().date()
        generated_count = DiaryImage.objects.filter(
            diary__user=user,
            created_at__date=today
        ).count()

        pref = UserPreference.get_or_create_for_user(user)
        limit = 10 if pref.is_premium else 2

        if generated_count >= limit:
            return False, {
                'limit': limit,
                'current': generated_count,
                'message': f"하루 생성 한도({limit}장)를 초과했습니다."
            }
        
        return True, {'limit': limit, 'current': generated_count}

    @staticmethod
    def check_daily_diary_limit(user):
        """
        Check if the user has already written a diary today.
        Returns:
            tuple: (is_allowed: bool, existing_diary: Diary or None)
        """
        today = date.today()
        existing_diary = Diary.objects.filter(
            user=user,
            created_at__date=today
        ).first()
        
        if existing_diary:
            return False, existing_diary
            
        return True, None
