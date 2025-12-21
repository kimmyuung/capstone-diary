/**
 * API 재시도 유틸리티
 * 
 * 네트워크 오류나 서버 오류 시 자동으로 재시도합니다.
 */
import { isRetryableError } from './errorHandler';

interface RetryOptions {
    /** 최대 재시도 횟수 (기본값: 3) */
    maxRetries?: number;
    /** 재시도 간 대기 시간 (ms) (기본값: 1000) */
    baseDelay?: number;
    /** 지수 백오프 사용 여부 (기본값: true) */
    exponentialBackoff?: boolean;
    /** 재시도 가능한 에러인지 확인하는 함수 */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** 재시도 시 호출되는 콜백 */
    onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * 재시도 로직을 포함한 비동기 함수 실행
 * 
 * @example
 * const data = await withRetry(() => api.get('/diaries'));
 * 
 * @example
 * const data = await withRetry(
 *   () => api.post('/diaries', { title: 'Test' }),
 *   { maxRetries: 5, baseDelay: 2000 }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        exponentialBackoff = true,
        shouldRetry = defaultShouldRetry,
        onRetry,
    } = options || {};

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // 마지막 시도이거나 재시도 불가능한 에러면 throw
            if (attempt === maxRetries || !shouldRetry(error, attempt)) {
                throw error;
            }

            // 재시도 콜백 호출
            if (onRetry) {
                onRetry(error, attempt);
            }

            // 대기
            const delay = exponentialBackoff
                ? baseDelay * Math.pow(2, attempt - 1)
                : baseDelay;

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * 기본 재시도 가능 여부 확인 함수
 */
function defaultShouldRetry(error: unknown, _attempt: number): boolean {
    return isRetryableError(error);
}

/**
 * 지정된 시간만큼 대기
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 타임아웃이 있는 Promise 실행
 * 
 * @example
 * const data = await withTimeout(
 *   api.get('/slow-endpoint'),
 *   5000,
 *   '응답 시간이 초과되었습니다'
 * );
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage?: string
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(errorMessage || `Timeout after ${ms}ms`));
        }, ms);
    });

    return Promise.race([promise, timeout]);
}

/**
 * 디바운스된 함수 생성
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
