# diary/tests/test_encryption.py
"""
암호화 서비스 테스트
- 암호화/복호화 정상 동작
- 에러 처리
- 레거시 데이터 지원
"""
from django.test import TestCase, override_settings
from diary.encryption import DiaryEncryptionService, EncryptionError, get_encryption_service


class EncryptionServiceTest(TestCase):
    """암호화 서비스 단위 테스트"""
    
    @override_settings(DIARY_ENCRYPTION_KEY='test-key-for-encryption-32bytes!')
    def test_encrypt_and_decrypt(self):
        """암호화 후 복호화 시 원본 복원"""
        service = DiaryEncryptionService()
        
        original = '오늘은 정말 좋은 하루였습니다. 비밀 일기입니다.'
        encrypted = service.encrypt(original)
        decrypted = service.decrypt(encrypted)
        
        self.assertEqual(decrypted, original)
        self.assertNotEqual(encrypted, original)
        
    @override_settings(DIARY_ENCRYPTION_KEY='test-key-for-encryption-32bytes!')
    def test_encrypted_content_is_different(self):
        """암호화된 내용은 원본과 다름"""
        service = DiaryEncryptionService()
        
        original = '민감한 정보'
        encrypted = service.encrypt(original)
        
        self.assertNotEqual(encrypted, original)
        self.assertTrue(encrypted.startswith('gAAAAA'))  # Fernet 형식
        
    @override_settings(DIARY_ENCRYPTION_KEY='')
    def test_no_key_returns_plain_text(self):
        """키 미설정 시 평문 반환"""
        service = DiaryEncryptionService()
        
        self.assertFalse(service.is_enabled)
        
        result = service.encrypt('테스트')
        self.assertEqual(result, '테스트')
        
    @override_settings(DIARY_ENCRYPTION_KEY='test-key-for-encryption-32bytes!')
    def test_decrypt_plain_text_returns_as_is(self):
        """암호화되지 않은 텍스트는 그대로 반환"""
        service = DiaryEncryptionService()
        
        plain_text = '암호화되지 않은 일반 텍스트'
        result = service.decrypt(plain_text)
        
        self.assertEqual(result, plain_text)
        
    @override_settings(DIARY_ENCRYPTION_KEY='test-key-for-encryption-32bytes!')
    def test_korean_content_encryption(self):
        """한글 내용 암호화/복호화"""
        service = DiaryEncryptionService()
        
        korean_text = '오늘 친구와 함께 맛있는 식사를 했습니다. 행복한 하루! 🎉'
        encrypted = service.encrypt(korean_text)
        decrypted = service.decrypt(encrypted)
        
        self.assertEqual(decrypted, korean_text)
        
    @override_settings(DIARY_ENCRYPTION_KEY='test-key-for-encryption-32bytes!')
    def test_long_content_encryption(self):
        """긴 내용 암호화/복호화"""
        service = DiaryEncryptionService()
        
        long_text = '오늘의 일기. ' * 1000  # 약 12KB
        encrypted = service.encrypt(long_text)
        decrypted = service.decrypt(encrypted)
        
        self.assertEqual(decrypted, long_text)
        
    @override_settings(DIARY_ENCRYPTION_KEY='test-key-for-encryption-32bytes!')
    def test_empty_content(self):
        """빈 내용 처리"""
        service = DiaryEncryptionService()
        
        empty = ''
        encrypted = service.encrypt(empty)
        decrypted = service.decrypt(encrypted)
        
        self.assertEqual(decrypted, empty)


class EncryptionServiceSingletonTest(TestCase):
    """암호화 서비스 싱글톤 테스트"""
    
    def test_get_encryption_service_returns_same_instance(self):
        """get_encryption_service는 동일 인스턴스 반환"""
        service1 = get_encryption_service()
        service2 = get_encryption_service()
        
        self.assertIs(service1, service2)
