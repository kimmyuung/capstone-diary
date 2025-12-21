/**
 * 에러 처리 유틸리티
 * 
 * API 에러를 파싱하고 사용자 친화적인 메시지로 변환합니다.
 */
import axios, { AxiosError } from 'axios';
import { Alert } from 'react-native';
import { ApiError, ErrorCode, ErrorMessages } from '@/types/errors';

/**
 * Axios 에러인지 확인
 */
export const isAxiosError = (error: unknown): error is AxiosError => {
    return axios.isAxiosError(error);
};

/**
 * API 에러 응답인지 확인
 */
export const isApiError = (data: unknown): data is ApiError => {
    return (
        typeof data === 'object' &&
        data !== null &&
        'success' in data &&
        (data as any).success === false &&
        'error' in data
    );
};

/**
 * 에러에서 에러 코드 추출
 */
export const getErrorCode = (error: unknown): ErrorCode => {
    if (isAxiosError(error)) {
        // 네트워크 에러 (응답 없음)
        if (!error.response) {
            if (error.code === 'ECONNABORTED') {
                return ErrorCode.TIMEOUT;
            }
            return ErrorCode.NETWORK_ERROR;
        }

        const data = error.response.data;

        // API 에러 응답
        if (isApiError(data) && data.code) {
            return data.code as ErrorCode;
        }

        // HTTP 상태 코드로 에러 타입 유추
        const status = error.response.status;
        if (status === 401) return ErrorCode.AUTH_REQUIRED;
        if (status === 403) return ErrorCode.PERMISSION_DENIED;
        if (status === 404) return ErrorCode.NOT_FOUND;
        if (status === 422 || status === 400) return ErrorCode.VALIDATION_ERROR;
        if (status === 429) return ErrorCode.RATE_LIMIT_EXCEEDED;
        if (status >= 500) return ErrorCode.SERVER_ERROR;
    }

    return ErrorCode.UNKNOWN;
};

/**
 * 에러에서 사용자 친화적인 메시지 추출
 */
export const getErrorMessage = (error: unknown): string => {
    if (isAxiosError(error)) {
        const data = error.response?.data;

        // API 에러 응답에서 메시지 추출
        if (isApiError(data)) {
            return data.error;
        }

        // 레거시 에러 형식 처리
        if (typeof data === 'object' && data !== null) {
            if ('error' in data && typeof data.error === 'string') {
                return data.error;
            }
            if ('message' in data && typeof data.message === 'string') {
                return data.message;
            }
            if ('detail' in data && typeof data.detail === 'string') {
                return data.detail;
            }
        }
    }

    // 에러 코드로 기본 메시지 반환
    const code = getErrorCode(error);
    return ErrorMessages[code];
};

/**
 * 유효성 검증 에러의 상세 정보 추출
 */
export const getValidationErrors = (error: unknown): Record<string, string> | null => {
    if (isAxiosError(error)) {
        const data = error.response?.data;

        if (isApiError(data) && data.details) {
            const result: Record<string, string> = {};

            if (typeof data.details === 'object' && !Array.isArray(data.details)) {
                Object.entries(data.details).forEach(([key, value]) => {
                    if (Array.isArray(value) && value.length > 0) {
                        result[key] = value[0];
                    } else if (typeof value === 'string') {
                        result[key] = value;
                    }
                });
                return result;
            }
        }
    }

    return null;
};

/**
 * 에러를 Alert로 표시
 */
export const showErrorAlert = (
    error: unknown,
    options?: {
        title?: string;
        onDismiss?: () => void;
    }
): void => {
    const message = getErrorMessage(error);
    const title = options?.title || '오류';

    const buttons = options?.onDismiss
        ? [{ text: '확인', onPress: options.onDismiss }]
        : [{ text: '확인' }];

    Alert.alert(title, message, buttons);
};

/**
 * 인증 관련 에러인지 확인
 */
export const isAuthError = (error: unknown): boolean => {
    const code = getErrorCode(error);
    return [
        ErrorCode.AUTH_REQUIRED,
        ErrorCode.AUTH_FAILED,
        ErrorCode.TOKEN_EXPIRED,
    ].includes(code);
};

/**
 * 재시도 가능한 에러인지 확인
 */
export const isRetryableError = (error: unknown): boolean => {
    const code = getErrorCode(error);
    return [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.TIMEOUT,
        ErrorCode.SERVER_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE,
    ].includes(code);
};

/**
 * 콘솔에 에러 로깅 (개발용)
 */
export const logError = (error: unknown, context?: string): void => {
    if (__DEV__) {
        const code = getErrorCode(error);
        const message = getErrorMessage(error);

        console.error(`[${context || 'Error'}]`, {
            code,
            message,
            error: isAxiosError(error)
                ? {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    data: error.response?.data,
                }
                : error,
        });
    }
};
