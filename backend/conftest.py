import pytest
from unittest.mock import MagicMock
import sys

# Mock google.generativeai to prevent API calls and deprecation warnings
module_mock = MagicMock()
sys.modules["google.generativeai"] = module_mock
sys.modules["google.genai"] = module_mock

@pytest.fixture(autouse=True)
def set_testing_flag(settings):
    settings.IS_TESTING = True

@pytest.fixture(autouse=True)
def mock_gemini_api(monkeypatch):
    """
    Automatically mock Gemini API calls for all tests.
    """
    monkeypatch.setattr("diary.ai_service.genai", MagicMock())
    monkeypatch.setattr("diary.services.chat_service.genai", MagicMock())

@pytest.fixture(autouse=True)
def mock_sentence_transformer(monkeypatch):
    """
    Automatically mock SentenceTransformer for all tests to avoid downloading models.
    """
    import numpy as np
    mock_model = MagicMock()
    # Mock encode to return a numpy array (which has tolist())
    mock_model.encode.return_value = np.array([0.1] * 384)
    
    mock_class = MagicMock(return_value=mock_model)
    monkeypatch.setattr("diary.services.chat_service.SentenceTransformer", mock_class)

    
@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()
