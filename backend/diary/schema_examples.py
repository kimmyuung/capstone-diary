from drf_spectacular.utils import OpenApiExample

# 400 Bad Request
EXAMPLE_400_BAD_REQUEST = OpenApiExample(
    'Bad Request (Validation Error)',
    summary='입력값 유효성 검사 실패',
    description='필수 필드가 누락되었거나 형식이 잘못되었습니다.',
    value={
        "username": ["필수 항목입니다."],
        "email": ["유효한 이메일 주소를 입력하십시오."]
    },
    status_codes=['400']
)

EXAMPLE_400_INVALID_PARAM = OpenApiExample(
    'Bad Request (Invalid Parameter)',
    summary='잘못된 파라미터',
    description='요청 파라미터가 허용된 범위를 벗어났습니다.',
    value={
        "error": "Invalid year format. Must be YYYY."
    },
    status_codes=['400']
)

# 401 Unauthorized
EXAMPLE_401_UNAUTHORIZED = OpenApiExample(
    'Unauthorized',
    summary='인증 실패',
    description='토큰이 없거나 유효하지 않습니다. Access Token을 헤더에 포함해주세요.',
    value={
        "detail": "자격 인증데이터(authentication credentials)가 제공되지 않았습니다."
    },
    status_codes=['401']
)

EXAMPLE_401_TOKEN_EXPIRED = OpenApiExample(
    'Unauthorized (Token Expired)',
    summary='토큰 만료',
    description='Access Token이 만료되었습니다. Refresh Token으로 갱신해주세요.',
    value={
        "detail": "Given token not valid for any token type",
        "code": "token_not_valid",
        "messages": [
            {
                "token_class": "AccessToken",
                "token_type": "access",
                "message": "Token is invalid or expired"
            }
        ]
    },
    status_codes=['401']
)

# 403 Forbidden
EXAMPLE_403_FORBIDDEN = OpenApiExample(
    'Forbidden',
    summary='권한 없음',
    description='해당 리소스에 접근할 권한이 없습니다 (예: 다른 사용자의 일기 접근).',
    value={
        "detail": "이 작업을 수행할 권한이 없습니다."
    },
    status_codes=['403']
)

# 404 Not Found
EXAMPLE_404_NOT_FOUND = OpenApiExample(
    'Not Found',
    summary='리소스 없음',
    description='요청한 일기나 리소스를 찾을 수 없습니다.',
    value={
        "detail": "찾을 수 없습니다."
    },
    status_codes=['404']
)

# 409 Conflict
EXAMPLE_409_CONFLICT = OpenApiExample(
    'Conflict',
    summary='리소스 충돌',
    description='동시에 다른 요청에 의해 리소스가 수정되었습니다 (Optimistic Locking). 최신 데이터를 조회 후 다시 시도하세요.',
    value={
        "detail": "데이터가 다른 곳에서 수정되었습니다. 최신 데이터를 확인해주세요.",
        "code": "conflict"
    },
    status_codes=['409']
)

# 429 Too Many Requests
EXAMPLE_429_THROTTLED = OpenApiExample(
    'Throttled',
    summary='요청 한도 초과',
    description='API 요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
    value={
        "detail": "요청 한도네 도달했습니다. 54초 후에 다시 시도하십시오."
    },
    status_codes=['429']
)

# 500 Internal Server Error
EXAMPLE_500_SERVER_ERROR = OpenApiExample(
    'Server Error',
    summary='서버 내부 오류',
    description='서버에서 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.',
    value={
        "detail": "서버 내부 오류가 발생했습니다."
    },
    status_codes=['500']
)
