from datetime import date, timedelta
from ..models import UserPreference

class StreakService:
    @staticmethod
    def update_user_streak(user):
        """
        Update the user's streak when a diary is created.
        Returns:
            tuple: (current_streak: int, max_streak: int)
        """
        preference = UserPreference.get_or_create_for_user(user)
        today = date.today()
        
        if preference.last_diary_date is None:
            # First diary
            preference.current_streak = 1
            preference.max_streak = 1
        elif preference.last_diary_date == today:
            # Already written today - no change
            pass
        elif preference.last_diary_date == today - timedelta(days=1):
            # Written yesterday + today = consecutive
            preference.current_streak += 1
            if preference.current_streak > preference.max_streak:
                preference.max_streak = preference.current_streak
        else:
            # Streak broken - reset to 1
            preference.current_streak = 1
        
        preference.last_diary_date = today
        preference.save()
        
        return preference.current_streak, preference.max_streak
