/**
 * 폼 에러 처리 훅
 * 
 * API 유효성 검증 에러를 필드별로 관리하고 표시합니다.
 */
import { useState, useCallback } from 'react';
import {
    getValidationErrors,
    formatValidationErrors,
    getErrorMessage,
    isNetworkError
} from '@/utils/errorHandler';

interface UseFormErrorsReturn {
    /** 필드별 에러 맵 */
    errors: Record<string, string>;
    /** 특정 필드 에러 */
    getFieldError: (field: string) => string | undefined;
    /** 에러 설정 (API 에러에서 추출) */
    setErrorsFromResponse: (error: unknown) => void;
    /** 특정 필드 에러 클리어 */
    clearFieldError: (field: string) => void;
    /** 모든 에러 클리어 */
    clearAllErrors: () => void;
    /** 수동으로 필드 에러 설정 */
    setFieldError: (field: string, message: string) => void;
    /** 에러 존재 여부 */
    hasErrors: boolean;
    /** 네트워크 에러 여부 */
    isNetworkErr: boolean;
    /** 일반 에러 메시지 */
    generalError: string | null;
}

/**
 * 폼 에러 관리 훅
 */
export const useFormErrors = (): UseFormErrorsReturn => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [isNetworkErr, setIsNetworkErr] = useState(false);

    /**
     * API 에러 응답에서 에러 추출
     */
    const setErrorsFromResponse = useCallback((error: unknown) => {
        // 네트워크 에러 체크
        if (isNetworkError(error)) {
            setIsNetworkErr(true);
            setGeneralError('네트워크 연결을 확인해주세요');
            return;
        }

        setIsNetworkErr(false);

        // 필드별 유효성 검증 에러 추출
        const validationErrors = getValidationErrors(error);

        if (validationErrors && Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setGeneralError(null);
        } else {
            // 일반 에러 메시지
            setErrors({});
            setGeneralError(getErrorMessage(error));
        }
    }, []);

    /**
     * 특정 필드 에러 반환
     */
    const getFieldError = useCallback((field: string): string | undefined => {
        return errors[field];
    }, [errors]);

    /**
     * 특정 필드 에러 클리어
     */
    const clearFieldError = useCallback((field: string) => {
        setErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    /**
     * 모든 에러 클리어
     */
    const clearAllErrors = useCallback(() => {
        setErrors({});
        setGeneralError(null);
        setIsNetworkErr(false);
    }, []);

    /**
     * 수동으로 필드 에러 설정
     */
    const setFieldError = useCallback((field: string, message: string) => {
        setErrors(prev => ({ ...prev, [field]: message }));
    }, []);

    return {
        errors,
        getFieldError,
        setErrorsFromResponse,
        clearFieldError,
        clearAllErrors,
        setFieldError,
        hasErrors: Object.keys(errors).length > 0 || generalError !== null,
        isNetworkErr,
        generalError,
    };
};

export default useFormErrors;
