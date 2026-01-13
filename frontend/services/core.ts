import axios from 'axios';
import { logError, isAuthError } from '@/utils/errorHandler';

// API 기본 URL 설정
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Axios 인스턴스 생성
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
    (config) => {
        if (__DEV__) {
            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        logError(error, 'Request Interceptor');
        return Promise.reject(error);
    }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    async (error) => {
        logError(error, 'Response Interceptor');
        if (isAuthError(error)) {
            // 토큰 갱신 로직 (추후 구현)
        }
        return Promise.reject(error);
    }
);

// 토큰 설정 함수
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export { api };
