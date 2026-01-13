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
    - [Phase 2] Key Rotation 지원
    - 다중 키 버전 관리 및 자동 전환
    """
    
    def __init__(self):
        self._ciphers = {} # {version: Fernet}
        self._latest_version = getattr(settings, 'CURRENT_ENCRYPTION_VERSION', 1)
        self._initialize_ciphers()
    
    def _initialize_ciphers(self):
        """설정된 모든 버전의 암호화 키 초기화"""
        keys_map = getattr(settings, 'DIARY_ENCRYPTION_KEYS', {})
        
        # Fallback for backward compatibility
        legacy_key = getattr(settings, 'DIARY_ENCRYPTION_KEY', None)
        if legacy_key and 1 not in keys_map:
            keys_map[1] = legacy_key
            
        if not keys_map:
            logger.warning("No encryption keys configured. Encryption disabled.")
            return

        for version, key in keys_map.items():
            if not key:
                continue
            try:
                # Base64로 인코딩된 32바이트 키
                if len(key) != 44:
                    key_bytes = key.encode()[:32].ljust(32, b'\0')
                    key = base64.urlsafe_b64encode(key_bytes).decode()
                
                self._ciphers[version] = Fernet(key.encode())
                logger.debug(f"Encryption key version {version} initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize key version {version}: {e}")
        
        logger.info(f"Initialized {len(self._ciphers)} encryption keys. Latest version: {self._latest_version}")
    
    @property
    def is_enabled(self) -> bool:
        """암호화가 활성화되어 있는지 확인 (최신 키 존재 여부)"""
        return self._latest_version in self._ciphers
    
    def encrypt(self, content: str) -> str:
        """
        일기 내용을 최신 키로 암호화합니다.
        """
        if not self.is_enabled:
            logger.debug("Encryption disabled, returning plain content")
            return content
        
        try:
            cipher = self._ciphers[self._latest_version]
            encrypted_bytes = cipher.encrypt(content.encode('utf-8'))
            encrypted_text = encrypted_bytes.decode('utf-8')
            return encrypted_text
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt content: {e}")
    
    def decrypt(self, encrypted_content: str, version: int = 1) -> str:
        """
        지정된 버전의 키로 암호화된 내용을 복호화합니다.
        """
        if not self.is_enabled or not encrypted_content:
            return encrypted_content or ""
            
        cipher = self._ciphers.get(version)
        if not cipher:
            # 키를 찾을 수 없는 경우 (폐기된 키 등)
            logger.error(f"Decryption key for version {version} not found.")
            # Fallback: Try all available keys (Rescue strategy)
            for ver, fallback_cipher in self._ciphers.items():
                if ver == version: continue
                try:
                    return fallback_cipher.decrypt(encrypted_content.encode('utf-8')).decode('utf-8')
                except:
                    continue
            raise EncryptionError(f"Decryption key version {version} missing and fallback failed.")
        
        try:
            decrypted_bytes = cipher.decrypt(encrypted_content.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except InvalidToken:
             # 키 버전이 맞지 않거나 데이터가 깨진 경우 다른 키로 시도해볼 수 있음 (Optional Safety)
            logger.warning(f"InvalidToken with version {version}. Trying other keys...")
            for ver, fallback_cipher in self._ciphers.items():
                if ver == version: continue
                try:
                    res = fallback_cipher.decrypt(encrypted_content.encode('utf-8')).decode('utf-8')
                    logger.info(f"Recovered content using key version {ver}")
                    return res
                except:
                    continue
            raise EncryptionError("Failed to decrypt content: invalid key")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise EncryptionError(f"Failed to decrypt content: {e}")


class EncryptionError(Exception):
    pass


_encryption_service = None

def get_encryption_service() -> DiaryEncryptionService:
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = DiaryEncryptionService()
    return _encryption_service
