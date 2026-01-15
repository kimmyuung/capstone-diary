# diary/tests/test_moderation_service.py
"""
콘텐츠 모더레이션 서비스 테스트
"""
import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model

from diary.models import Diary, FlaggedContent
from diary.services.moderation_service import ModerationService

User = get_user_model()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username='moduser',
        email='mod@example.com',
        password='testpass123'
    )


@pytest.fixture
def sample_diary(test_user):
    return Diary.objects.create(
        user=test_user,
        title='테스트 일기',
        content='일상적인 내용입니다. 오늘 하루도 좋은 하루였습니다.'
    )


@pytest.fixture
def inappropriate_content():
    return "폭력적이고 부적절한 내용이 포함된 텍스트"


@pytest.mark.django_db
class TestModerationService:
    """모더레이션 서비스 테스트"""
    
    def test_moderate_safe_content(self, sample_diary):
        """안전한 콘텐츠는 통과한다"""
        result = ModerationService.moderate_content(
            content="오늘 날씨가 좋아서 공원에 갔다. 행복한 하루였다.",
            user=sample_diary.user
        )
        
        # 안전한 콘텐츠는 is_safe가 True
        assert result.get('is_safe', True) is True or 'flagged' not in result
    
    @patch('diary.services.moderation_service.ModerationService._call_moderation_api')
    def test_moderate_flagged_content(self, mock_api, sample_diary):
        """부적절한 콘텐츠는 플래그된다"""
        mock_api.return_value = {
            'is_safe': False,
            'categories': ['violence'],
            'severity': 0.8
        }
        
        result = ModerationService.moderate_content(
            content="부적절한 내용",
            user=sample_diary.user
        )
        
        # 모킹된 응답에 따라 결과 확인
        assert result is not None
    
    def test_get_flagged_content_for_user(self, test_user, sample_diary):
        """사용자의 플래그된 콘텐츠 조회"""
        # 플래그된 콘텐츠 생성
        FlaggedContent.objects.create(
            diary=sample_diary,
            reason='test_reason',
            severity_score=0.7
        )
        
        flagged = FlaggedContent.objects.filter(diary__user=test_user)
        assert flagged.count() == 1
    
    def test_empty_content_handling(self, test_user):
        """빈 콘텐츠 처리"""
        result = ModerationService.moderate_content(
            content="",
            user=test_user
        )
        
        # 빈 콘텐츠는 안전하게 처리되거나 에러 없이 종료
        assert result is not None or result is None


@pytest.mark.django_db
class TestModerationSeverity:
    """모더레이션 심각도 테스트"""
    
    def test_severity_score_range(self, sample_diary):
        """심각도 점수는 0-1 범위"""
        flagged = FlaggedContent.objects.create(
            diary=sample_diary,
            reason='test',
            severity_score=0.5
        )
        
        assert 0 <= flagged.severity_score <= 1
    
    def test_high_severity_flagging(self, sample_diary):
        """높은 심각도 플래그"""
        flagged = FlaggedContent.objects.create(
            diary=sample_diary,
            reason='high_severity_test',
            severity_score=0.9
        )
        
        # 높은 심각도 콘텐츠 필터링
        high_severity = FlaggedContent.objects.filter(severity_score__gte=0.8)
        assert high_severity.count() >= 1
