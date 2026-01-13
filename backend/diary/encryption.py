# diary/encryption.py
"""
일기 내용 암호화/복호화 서비스
AES-256 (Fernet) 암호화 사용
"""
import base64
import logging
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger('diary')


class DiaryEncryptionService:
    """
    일기 내용을 안전하게 암호화/복호화하는 서비스
    
    사용법:
        service = DiaryEncryptionService()
        encrypted = service.encrypt("민감한 일기 내용")
        decrypted = service.decrypt(encrypted)
    """
    
    def __init__(self):
        self._cipher = None
        self._initialize_cipher()
    
    def _initialize_cipher(self):
        """암호화 키 초기화"""
        key = getattr(settings, 'DIARY_ENCRYPTION_KEY', None)
        
        if not key:
            logger.warning("DIARY_ENCRYPTION_KEY not set. Encryption disabled.")
            return
        
        try:
            # Base64로 인코딩된 32바이트 키
            if len(key) != 44:  # Fernet 키는 URL-safe base64로 44자
                # 문자열 키를 Fernet 키로 변환
                key_bytes = key.encode()[:32].ljust(32, b'\0')
                key = base64.urlsafe_b64encode(key_bytes).decode()
            
            self._cipher = Fernet(key.encode())
            logger.info("Diary encryption initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            self._cipher = None
    
    @property
    def is_enabled(self) -> bool:
        """암호화가 활성화되어 있는지 확인"""
        return self._cipher is not None
    
    def encrypt(self, content: str) -> str:
        """
        일기 내용을 암호화합니다.
        
        Args:
            content: 암호화할 원본 텍스트
            
        Returns:
            암호화된 텍스트 (Base64)
        """
        if not self.is_enabled:
            logger.debug("Encryption disabled, returning plain content")
            return content
        
        try:
            encrypted_bytes = self._cipher.encrypt(content.encode('utf-8'))
            encrypted_text = encrypted_bytes.decode('utf-8')
            logger.debug(f"Content encrypted successfully (length: {len(encrypted_text)})")
            return encrypted_text
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt content: {e}")
    
    
    def decrypt(self, encrypted_content: str) -> str:
        """
        암호화된 일기 내용을 복호화합니다.
        
        주의: 이 메서드는 입력값이 암호화되어 있다고 가정하고 무조건 복호화를 시도합니다.
        암호화 여부(`is_encrypted`)는 호출자(Model)가 책임지고 확인해야 합니다.
        
        Args:
            encrypted_content: 암호화된 텍스트
            
        Returns:
            복호화된 원본 텍스트
        """
        if not self.is_enabled:
            logger.debug("Encryption disabled, returning content as-is")
            return encrypted_content
        
        if not encrypted_content:
            return ""
        
        try:
            decrypted_bytes = self._cipher.decrypt(encrypted_content.encode('utf-8'))
            decrypted_text = decrypted_bytes.decode('utf-8')
            logger.debug("Content decrypted successfully")
            return decrypted_text
        except InvalidToken as e:
            logger.error(f"Invalid encryption token: {e}")
            raise EncryptionError("Failed to decrypt content: invalid key or corrupted data")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise EncryptionError(f"Failed to decrypt content: {e}")


class EncryptionError(Exception):
    """암호화/복호화 관련 예외"""
    pass


# 싱글톤 인스턴스
_encryption_service = None


def get_encryption_service() -> DiaryEncryptionService:
    """암호화 서비스 싱글톤 인스턴스 반환"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = DiaryEncryptionService()
    return _encryption_service
