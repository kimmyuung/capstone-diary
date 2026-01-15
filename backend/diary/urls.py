from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DiaryViewSet, TagViewSet, DiaryTemplateViewSet,
    UserPreferenceView, ThemeView,
    SummarizeView, SuggestTitleView
)
from .views.preference_views import StreakView
from .views.admin_views import (
    AdminStatsView, AdminUsersView, AdminRecentDiariesView, AdminModerationView
)
from .views.monitoring_views import AIUsageStatsView, SystemHealthView, SystemMetricsView
from .views.test_views import test_image_gen_view

router = DefaultRouter()
router.register(r'diaries', DiaryViewSet, basename='diary')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'templates', DiaryTemplateViewSet, basename='template')

urlpatterns = [
    path('', include(router.urls)),
    
    # 사용자 설정 API
    path('preferences/', UserPreferenceView.as_view(), name='user_preferences'),
    path('preferences/theme/', ThemeView.as_view(), name='user_theme'),
    path('preferences/streak/', StreakView.as_view(), name='user_streak'),
    
    # AI 도우미 API
    path('summarize/', SummarizeView.as_view(), name='summarize'),
    path('suggest-title/', SuggestTitleView.as_view(), name='suggest_title'),
    
    # 관리자 API
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('admin/users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin/users/<int:user_id>/', AdminUsersView.as_view(), name='admin_user_detail'),
    path('admin/diaries/recent/', AdminRecentDiariesView.as_view(), name='admin_recent_diaries'),
    path('admin/moderation/', AdminModerationView.as_view(), name='admin_moderation'),
    path('admin/moderation/<int:item_id>/', AdminModerationView.as_view(), name='admin_moderation_action'),
    
    # 시스템 모니터링 API
    path('admin/ai-usage/', AIUsageStatsView.as_view(), name='admin_ai_usage'),
    path('admin/system/health/', SystemHealthView.as_view(), name='admin_system_health'),
    path('admin/system/metrics/', SystemMetricsView.as_view(), name='admin_system_metrics'),
    
    # 테스트 API (나중에 삭제)
    path('test-image/', test_image_gen_view, name='test_image_gen'),
]
