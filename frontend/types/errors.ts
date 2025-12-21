/**
 * 에러 타입 정의
 */
export interface ApiError {
    success: false;
    error: string;
    code: ErrorCode;
    details?: Record<string, string[]> | string[];
    retry_after?: number;
}

/**
 * 에러 코드 열거형
 */
export enum ErrorCode {
    // 인증 관련
    AUTH_REQUIRED = 'AUTH_REQUIRED',
    AUTH_FAILED = 'AUTH_FAILED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    // 요청 관련
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    BAD_REQUEST = 'BAD_REQUEST',

    // 서버 관련
    SERVER_ERROR = 'SERVER_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

    // 네트워크 관련 (프론트엔드 전용)
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',

    // 비즈니스 로직
    DIARY_NOT_FOUND = 'DIARY_NOT_FOUND',
    ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
    AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
    EMAIL_SEND_ERROR = 'EMAIL_SEND_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // 알 수 없는 에러
    UNKNOWN = 'UNKNOWN',
}

/**
 * 에러 코드별 기본 메시지
 */
export const ErrorMessages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_REQUIRED]: '로그인이 필요합니다',
    [ErrorCode.AUTH_FAILED]: '인증에 실패했습니다',
    [ErrorCode.TOKEN_EXPIRED]: '로그인이 만료되었습니다. 다시 로그인해주세요',
    [ErrorCode.PERMISSION_DENIED]: '접근 권한이 없습니다',
    [ErrorCode.VALIDATION_ERROR]: '입력값이 올바르지 않습니다',
    [ErrorCode.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다',
    [ErrorCode.BAD_REQUEST]: '잘못된 요청입니다',
    [ErrorCode.SERVER_ERROR]: '서버 오류가 발생했습니다',
    [ErrorCode.SERVICE_UNAVAILABLE]: '서비스를 일시적으로 사용할 수 없습니다',
    [ErrorCode.NETWORK_ERROR]: '네트워크 연결을 확인해주세요',
    [ErrorCode.TIMEOUT]: '요청 시간이 초과되었습니다',
    [ErrorCode.DIARY_NOT_FOUND]: '일기를 찾을 수 없습니다',
    [ErrorCode.ENCRYPTION_ERROR]: '암호화 처리 중 오류가 발생했습니다',
    [ErrorCode.AI_SERVICE_ERROR]: 'AI 서비스 오류가 발생했습니다',
    [ErrorCode.EMAIL_SEND_ERROR]: '이메일 전송에 실패했습니다',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
    [ErrorCode.UNKNOWN]: '알 수 없는 오류가 발생했습니다',
};
