# diary/messages.py
"""
다국어 지원을 위한 메시지 상수 정의

Django의 gettext_lazy를 사용하여 모든 사용자 대면 메시지를 관리합니다.
번역 파일 생성: python manage.py makemessages -l en
번역 파일 컴파일: python manage.py compilemessages
"""
from django.utils.translation import gettext_lazy as _


# =============================================================================
# 인증 관련 에러 메시지
# =============================================================================

# 입력 검증
ERROR_EMAIL_REQUIRED = _("이메일을 입력해주세요.")
ERROR_EMAIL_CODE_REQUIRED = _("이메일과 인증 코드를 입력해주세요.")
ERROR_ALL_FIELDS_REQUIRED = _("이메일, 인증 코드, 새 비밀번호를 모두 입력해주세요.")

# 유효성 검사
ERROR_INVALID_REQUEST = _("유효하지 않은 요청입니다.")
ERROR_INVALID_CODE = _("유효하지 않은 인증 코드입니다.")
ERROR_CODE_EXPIRED = _("인증 코드가 만료되었습니다. 다시 요청해주세요.")
ERROR_ALREADY_VERIFIED = _("이미 인증된 계정입니다.")

# 이메일 전송
ERROR_EMAIL_SEND_FAILED = _("이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.")


# =============================================================================
# 인증 관련 성공 메시지
# =============================================================================

SUCCESS_CODE_SENT = _("인증 코드가 이메일로 전송되었습니다.")
SUCCESS_CODE_SENT_10MIN = _("인증 코드가 이메일로 전송되었습니다. 10분 내에 인증을 완료해주세요.")
SUCCESS_CODE_SENT_30MIN = _("인증 코드가 이메일로 전송되었습니다. 30분 내에 입력해주세요.")
SUCCESS_EMAIL_VERIFIED = _("이메일 인증이 완료되었습니다. 로그인해주세요.")
SUCCESS_PASSWORD_CHANGED = _("비밀번호가 성공적으로 변경되었습니다.")
SUCCESS_PASSWORD_CHANGED_LOGIN = _("비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.")
SUCCESS_USERNAME_SENT = _("아이디 정보가 이메일로 전송되었습니다.")

# 보안상 항상 같은 메시지 (계정 존재 여부 숨김)
SUCCESS_CODE_SENT_IF_EXISTS = _("해당 이메일로 가입된 계정이 있다면 인증 코드가 전송됩니다.")
SUCCESS_USERNAME_SENT_IF_EXISTS = _("해당 이메일로 가입된 계정이 있다면 아이디 정보가 전송됩니다.")


# =============================================================================
# 일기 관련 에러 메시지
# =============================================================================

ERROR_INVALID_YEAR = _("유효하지 않은 연도입니다.")
ERROR_INVALID_YEAR_MONTH = _("유효하지 않은 연도/월입니다.")


# =============================================================================
# 푸시 알림 관련 메시지
# =============================================================================

ERROR_PUSH_TOKEN_REQUIRED = _("푸시 토큰이 필요합니다.")
ERROR_PUSH_TOKEN_NOT_FOUND = _("해당 토큰을 찾을 수 없습니다.")
SUCCESS_PUSH_TOKEN_REGISTERED = _("푸시 토큰이 등록되었습니다.")
SUCCESS_PUSH_TOKEN_UPDATED = _("푸시 토큰이 업데이트되었습니다.")
SUCCESS_PUSH_DISABLED = _("푸시 알림이 비활성화되었습니다.")


# =============================================================================
# 템플릿 관련 메시지
# =============================================================================

ERROR_SYSTEM_TEMPLATE_NO_DELETE = _("시스템 템플릿은 삭제할 수 없습니다.")
ERROR_SYSTEM_TEMPLATE_NO_EDIT = _("시스템 템플릿은 수정할 수 없습니다.")
ERROR_OWN_TEMPLATE_ONLY_DELETE = _("본인이 생성한 템플릿만 삭제할 수 있습니다.")
ERROR_OWN_TEMPLATE_ONLY_EDIT = _("본인이 생성한 템플릿만 수정할 수 있습니다.")
ERROR_TOPIC_REQUIRED = _("주제를 입력해주세요.")
ERROR_TOPIC_TOO_SHORT = _("주제를 2자 이상 입력해주세요.")
ERROR_TOPIC_TOO_LONG = _("주제는 50자 이하로 입력해주세요.")
ERROR_NAME_CONTENT_REQUIRED = _("이름과 내용은 필수입니다.")
ERROR_DUPLICATE_TEMPLATE_NAME = _("이미 동일한 이름의 템플릿이 있습니다.")
ERROR_TEMPLATE_GENERATION_FAILED = _("템플릿 생성 중 오류가 발생했습니다.")
SUCCESS_TEMPLATE_CREATED = _("템플릿이 생성되었습니다.")


# =============================================================================
# 공통 메시지
# =============================================================================

SUCCESS_API_CONNECTED = _("Django 백엔드 연결 성공! React Native 앱이 API를 잘 호출했습니다.")
