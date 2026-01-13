from django.test import TestCase
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from diary.services.stt_service import STTService
import os

class STTServiceTest(TestCase):
    def setUp(self):
        self.service = STTService()
        self.voice_content = b'fake-audio-content'
        self.voice_file = SimpleUploadedFile('test.m4a', self.voice_content, content_type='audio/m4a')
        # We need a real file path for the service to call voice_file.path?
        # SimpleUploadedFile doesn't have a path unless saved. 
        # But STTService uses voice_file.path.
        # So we should probably test it with a saved file or mock the file object to have a path.
        
        # Mock file path
        self.voice_file.path = '/tmp/test.m4a'

    @patch('diary.services.stt_service.genai')
    def test_transcribe_success(self, mock_genai):
        # Mock configure
        mock_genai.configure = MagicMock()
        
        # Mock upload_file return value
        mock_file = MagicMock()
        mock_file.state.name = "ACTIVE"
        mock_file.name = "files/123"
        mock_genai.upload_file.return_value = mock_file
        mock_genai.get_file.return_value = mock_file
        
        # Mock GenerativeModel
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "This is a transcribed text."
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        # Execute
        result = self.service.transcribe(self.voice_file)
        
        # Assert
        self.assertEqual(result, "This is a transcribed text.")
        mock_genai.upload_file.assert_called_once()
        mock_model.generate_content.assert_called_once()
        
    @patch('diary.services.stt_service.genai')
    def test_transcribe_failure(self, mock_genai):
        # Mock upload failure
        mock_genai.upload_file.side_effect = Exception("Upload failed")
        
        result = self.service.transcribe(self.voice_file)
        self.assertIsNone(result)
