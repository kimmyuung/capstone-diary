# diary/tests/test_template_api.py
"""
템플릿 API 테스트
"""
import pytest
import uuid
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from diary.models import DiaryTemplate


@pytest.fixture
def authenticated_client():
    """인증된 API 클라이언트"""
    unique_id = uuid.uuid4().hex[:8]
    user = User.objects.create_user(
        username=f'testuser_{unique_id}',
        email=f'test_{unique_id}@example.com',
        password='testpass123'
    )
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client


def get_response_data(response):
    """응답 데이터 추출 (페이지네이션 처리)"""
    data = response.json()
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    if isinstance(data, dict) and 'templates' in data:
        return data['templates']
    return data


@pytest.mark.django_db(transaction=True)
class TestTemplateAPI:
    """템플릿 CRUD 테스트"""
    
    def test_list_system_templates(self, authenticated_client):
        """시스템 템플릿 목록 조회"""
        response = authenticated_client.get('/api/templates/system/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'templates' in data
        assert 'count' in data
    
    def test_list_my_templates(self, authenticated_client):
        """내 템플릿 목록 조회"""
        response = authenticated_client.get('/api/templates/my/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'templates' in data
    
    def test_create_custom_template(self, authenticated_client):
        """커스텀 템플릿 생성"""
        data = {
            'name': '테스트 템플릿',
            'emoji': '📝',
            'description': '테스트용 템플릿입니다',
            'content': '오늘의 할 일:\n\n느낀 점:\n',
            'category': 'custom'
        }
        response = authenticated_client.post('/api/templates/', data)
        assert response.status_code == status.HTTP_201_CREATED
        
        result = response.json()
        assert result['name'] == '테스트 템플릿'
        assert result['template_type'] == 'user'
    
    def test_use_template(self, authenticated_client):
        """템플릿 사용 (사용 횟수 증가)"""
        # 템플릿 생성
        template = DiaryTemplate.objects.create(
            user=authenticated_client.user,
            template_type='user',
            name='사용 테스트',
            emoji='✅',
            description='사용 테스트',
            content='테스트 내용'
        )
        initial_count = template.use_count
        
        # 사용
        response = authenticated_client.post(f'/api/templates/{template.id}/use/')
        assert response.status_code == status.HTTP_200_OK
        
        # 사용 횟수 증가 확인
        template.refresh_from_db()
        assert template.use_count == initial_count + 1
    
    def test_delete_custom_template(self, authenticated_client):
        """커스텀 템플릿 삭제"""
        template = DiaryTemplate.objects.create(
            user=authenticated_client.user,
            template_type='user',
            name='삭제 테스트',
            emoji='🗑️',
            description='삭제될 템플릿',
            content='내용'
        )
        
        response = authenticated_client.delete(f'/api/templates/{template.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        assert not DiaryTemplate.objects.filter(id=template.id).exists()
    
    def test_cannot_delete_system_template(self, authenticated_client):
        """시스템 템플릿 삭제 불가"""
        template = DiaryTemplate.objects.create(
            user=None,
            template_type='system',
            name='시스템 템플릿',
            emoji='🔒',
            description='시스템 템플릿',
            content='삭제 불가'
        )
        
        response = authenticated_client.delete(f'/api/templates/{template.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_update_custom_template(self, authenticated_client):
        """커스텀 템플릿 수정"""
        template = DiaryTemplate.objects.create(
            user=authenticated_client.user,
            template_type='user',
            name='수정 전',
            emoji='📝',
            description='수정 테스트',
            content='원본'
        )
        
        response = authenticated_client.patch(
            f'/api/templates/{template.id}/',
            {'name': '수정 후', 'content': '수정된 내용'}
        )
        assert response.status_code == status.HTTP_200_OK
        
        template.refresh_from_db()
        assert template.name == '수정 후'
        assert template.content == '수정된 내용'
    
    def test_popular_templates(self, authenticated_client):
        """인기 템플릿 조회"""
        response = authenticated_client.get('/api/templates/popular/')
        assert response.status_code == status.HTTP_200_OK
        assert 'templates' in response.json()
    
    def test_templates_by_category(self, authenticated_client):
        """카테고리별 템플릿 조회"""
        response = authenticated_client.get('/api/templates/by-category/daily/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'category' in data
        assert data['category'] == 'daily'


@pytest.mark.django_db(transaction=True)
class TestTemplateIsolation:
    """템플릿 사용자 격리 테스트"""
    
    def test_cannot_access_other_user_template(self, authenticated_client):
        """다른 사용자 템플릿 접근 불가"""
        # 다른 사용자 생성
        other_user = User.objects.create_user(
            username='other_user',
            email='other@example.com',
            password='pass123'
        )
        
        # 다른 사용자의 템플릿
        template = DiaryTemplate.objects.create(
            user=other_user,
            template_type='user',
            name='비밀 템플릿',
            emoji='🔐',
            description='다른 사용자 것',
            content='접근 불가'
        )
        
        # 수정 시도
        response = authenticated_client.patch(
            f'/api/templates/{template.id}/',
            {'name': '해킹'}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
