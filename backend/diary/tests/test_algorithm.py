import pytest
from unittest.mock import MagicMock, patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from diary.ai_service import KeywordExtractor
from diary.models import Diary
from django.contrib.auth.models import User

@pytest.fixture
def api_client():
    return APIClient()

class TestKeywordExtractor:
    @patch('diary.ai_service.SentenceTransformer')
    @patch('diary.ai_service.CountVectorizer')
    @patch('diary.ai_service.cosine_similarity')
    def test_extract_keywords(self, mock_cosine, mock_vectorizer, mock_transformer):
        # Setup mocks
        extractor = KeywordExtractor()
        
        # Mock vectorizer output (candidates)
        mock_count_instance = mock_vectorizer.return_value
        mock_count_instance.fit.return_value = mock_count_instance
        mock_count_instance.get_feature_names_out.return_value = ['apple', 'banana', 'cherry']
        
        # Mock embeddings
        mock_model = mock_transformer.return_value
        mock_model.encode.return_value = [[1, 2, 3]] # Fake embedding
        
        # Mock cosine similarity (distances)
        # 3 candidates, so 1x3 matrix. argsort will pick indices. 
        # higher value = more similar. Let's say indices 0(apple)=0.1, 1(banana)=0.9, 2(cherry)=0.5
        mock_cosine.return_value = [[0.1, 0.9, 0.5]] 
        
        keywords = extractor.extract_keywords("I like apple and banana", top_n=2)
        
        # similarity: banana(0.9) > cherry(0.5) > apple(0.1)
        # argsort asc: [0, 2, 1] -> slice last 2: [2, 1] -> reverse: [1, 2] -> ['banana', 'cherry']
        
        # Note: The implementation uses argsort()[-top_n:] which gives indices of top N (ascending).
        # Then [::-1] reverses it to descending.
        # indices: 0(0.1), 1(0.9), 2(0.5). argsort -> [0, 2, 1] (values 0.1, 0.5, 0.9)
        # top_2 -> [2, 1]. reversed -> [1, 2] -> banana, cherry
        
        assert 'banana' in keywords
        assert 'cherry' in keywords
        assert len(keywords) == 2

@pytest.mark.django_db
class TestSimilarDiaryAPI:
    def test_similar_action_requires_auth(self, api_client):
        url = reverse('diary-detail', args=[999]) + 'similar/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_similar_action_logic(self, api_client):
        # Create user and diary
        user = User.objects.create_user(username='testuser', password='password')
        api_client.force_authenticate(user=user)
        
        diary = Diary.objects.create(user=user, title="Test Diary", content="Content")
        
        # Mock DiaryEmbedding.objects.get and filter
        with patch('diary.views.diary_views.DiaryEmbedding') as MockEmbedding:
            # Mock getting current diary embedding
            mock_emb_instance = MagicMock()
            MockEmbedding.objects.get.return_value = mock_emb_instance
            
            # Mock filter chain
            mock_queryset = MagicMock()
            MockEmbedding.objects.filter.return_value = mock_queryset
            mock_queryset.exclude.return_value = mock_queryset
            mock_queryset.order_by.return_value = mock_queryset
            
            # Mock query result (similar diaries)
            similar_diary = Diary(id=2, title="Similar", content="SimContent", emotion="Happy", user=user)
            similar_emb = MagicMock()
            similar_emb.diary = similar_diary
            mock_queryset.__getitem__.return_value = [similar_emb]
            
            url = reverse('diary-detail', args=[diary.id]) + 'similar/'
            response = api_client.get(url)
            
            assert response.status_code == status.HTTP_200_OK
            assert len(response.data) == 1
            assert response.data[0]['title'] == "Similar"
