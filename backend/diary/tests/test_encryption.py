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

    def test_key_rotation_fallback(self):
        """[Phase 2] Key Rotation & Fallback 테스트"""
        key_v1 = 'key-v1-for-encryption-32bytes!!!'
        key_v2 = 'key-v2-for-encryption-32bytes!!!'
        
        # 1. V1 키로 암호화
        with override_settings(DIARY_ENCRYPTION_KEYS={1: key_v1}, CURRENT_ENCRYPTION_VERSION=1):
            service_v1 = DiaryEncryptionService()
            original_content = "비밀 데이터"
            encrypted_v1 = service_v1.encrypt(original_content)
            
        # 2. V2가 최신이지만, V1도 키 목록에 있는 상태 (Rotation 직후)
        # decrypt 시 version=1을 명시하지 않아도(혹은 DB에 저장된 버전 사용) 풀려야 함.
        # 하지만 decrypt 메서드는 version 인자를 받으므로, 그걸 테스트.
        settings_override = {
            'DIARY_ENCRYPTION_KEYS': {1: key_v1, 2: key_v2},
            'CURRENT_ENCRYPTION_VERSION': 2
        }
        
        with override_settings(**settings_override):
            service_v2 = DiaryEncryptionService()
            
            # V2 서비스 인스턴스는 V2가 Default지만 V1도 로드되어 있어야 함
            self.assertTrue(service_v2.is_enabled)
            
            # V1으로 암호화된 내용을 복호화 (version=1 명시)
            decrypted = service_v2.decrypt(encrypted_v1, version=1)
            self.assertEqual(decrypted, original_content)
            
            # (심화) 만약 version 정보가 유실되어 기본값(1)이나 다른 값으로 들어왔을 때
            # Fallback 루프가 도는지 테스트 (InvalidToken 발생 -> Loop)
            # version=2 (최신)로 시도 -> 실패 -> Fallback Loop -> V1으로 성공
            decrypted_fallback = service_v2.decrypt(encrypted_v1, version=2)
            self.assertEqual(decrypted_fallback, original_content)
