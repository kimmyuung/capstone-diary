import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { logError, isAuthError } from '@/utils/errorHandler';

// API 기본 URL 설정
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// SecureStore (native) / localStorage (web) 분기
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
    SecureStore = require('expo-secure-store');
}

// 토큰 저장소 (플랫폼별)
const tokenStorage = {
    async getAccessToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem('jwt_token');
        }
        return SecureStore?.getItemAsync('jwt_token') ?? null;
    },
    async getRefreshToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem('jwt_refresh_token');
        }
        return SecureStore?.getItemAsync('jwt_refresh_token') ?? null;
    },
    async setTokens(access: string, refresh: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem('jwt_token', access);
            localStorage.setItem('jwt_refresh_token', refresh);
            return;
        }
        await SecureStore?.setItemAsync('jwt_token', access);
        await SecureStore?.setItemAsync('jwt_refresh_token', refresh);
    },
    async clearTokens(): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('jwt_refresh_token');
            return;
        }
        await SecureStore?.deleteItemAsync('jwt_token');
        await SecureStore?.deleteItemAsync('jwt_refresh_token');
    },
};

// 토큰 갱신 상태 관리 (중복 갱신 방지)
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
};

const onTokenRefreshed = (newToken: string) => {
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];
};

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
    async (config) => {
        const token = await tokenStorage.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
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

// 응답 인터셉터 - 에러 처리 및 토큰 자동 갱신
api.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // 401 에러이고, 재시도하지 않은 요청인 경우 토큰 갱신 시도
        if (error.response?.status === 401 && !originalRequest._retry) {
            // 로그인/토큰 갱신 요청은 제외
            if (originalRequest.url?.includes('/api/token/')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // 이미 갱신 중이면 대기열에 추가
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newToken: string) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await tokenStorage.getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // 토큰 갱신 요청
                const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access: newAccessToken, refresh: newRefreshToken } = response.data;

                // 새 토큰 저장
                await tokenStorage.setTokens(newAccessToken, newRefreshToken || refreshToken);

                // 대기 중인 요청들에게 새 토큰 전달
                onTokenRefreshed(newAccessToken);

                // 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // 갱신 실패 시 토큰 삭제 및 로그아웃 처리
                await tokenStorage.clearTokens();
                refreshSubscribers = [];

                // 전역 이벤트로 로그아웃 알림 (AuthContext에서 처리)
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }

                logError(refreshError as Error, 'Token Refresh Failed');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        logError(error, 'Response Interceptor');
        return Promise.reject(error);
    }
);

// 토큰 설정 함수 (로그인 시 사용)
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// 토큰 저장 함수 (로그인 시 사용)
export const saveTokens = async (access: string, refresh: string) => {
    await tokenStorage.setTokens(access, refresh);
    setAuthToken(access);
};

// 토큰 삭제 함수 (로그아웃 시 사용)
export const clearTokens = async () => {
    await tokenStorage.clearTokens();
    setAuthToken(null);
};

// 토큰 저장소 내보내기 (AuthContext에서 사용)
export { tokenStorage, api };
