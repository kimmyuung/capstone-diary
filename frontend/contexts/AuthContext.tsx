import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// API 기본 URL - 개발 환경에서는 localhost
const API_BASE_URL = 'http://localhost:8000';

interface AuthState {
    token: string | null;
    authenticated: boolean;
    loading: boolean;
}

// 로그인 결과 타입
export interface LoginResult {
    success: boolean;
    error?: 'EMAIL_NOT_VERIFIED' | 'INVALID_CREDENTIALS' | 'NETWORK_ERROR';
    message?: string;
    email?: string;  // 이메일 미인증 시 재인증을 위한 이메일 주소
}

interface AuthContextType extends AuthState {
    login: (username: string, password: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 플랫폼별 토큰 저장소 (웹: localStorage, 네이티브: SecureStore)
const tokenStorage = {
    async getToken(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem('jwt_token');
        }
        return await SecureStore.getItemAsync('jwt_token');
    },

    async setToken(token: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem('jwt_token', token);
            return;
        }
        await SecureStore.setItemAsync('jwt_token', token);
    },

    async removeToken(): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem('jwt_token');
            return;
        }
        await SecureStore.deleteItemAsync('jwt_token');
    },
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [authState, setAuthState] = useState<AuthState>({
        token: null,
        authenticated: false,
        loading: true,
    });

    useEffect(() => {
        const loadToken = async () => {
            try {
                const token = await tokenStorage.getToken();
                if (token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    setAuthState({
                        token: token,
                        authenticated: true,
                        loading: false,
                    });
                } else {
                    setAuthState({
                        token: null,
                        authenticated: false,
                        loading: false,
                    });
                }
            } catch (error) {
                console.error('Failed to load token:', error);
                setAuthState({
                    token: null,
                    authenticated: false,
                    loading: false,
                });
            }
        };
        loadToken();
    }, []);

    const login = async (username: string, password: string): Promise<LoginResult> => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/token/`, {
                username,
                password,
            });
            const { access: token } = response.data;

            await tokenStorage.setToken(token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setAuthState({
                token: token,
                authenticated: true,
                loading: false,
            });
            return { success: true };
        } catch (e: any) {
            console.error('Login failed:', e);

            // 백엔드 에러 응답 처리
            if (e.response?.data) {
                const { error, message, email } = e.response.data;

                if (error === 'EMAIL_NOT_VERIFIED') {
                    return {
                        success: false,
                        error: 'EMAIL_NOT_VERIFIED',
                        message: message || '이메일 인증이 필요합니다.',
                        email: email
                    };
                }

                return {
                    success: false,
                    error: 'INVALID_CREDENTIALS',
                    message: message || '아이디 또는 비밀번호가 올바르지 않습니다.'
                };
            }

            return {
                success: false,
                error: 'NETWORK_ERROR',
                message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            };
        }
    };

    const logout = async () => {
        await tokenStorage.removeToken();
        delete axios.defaults.headers.common['Authorization'];
        setAuthState({
            token: null,
            authenticated: false,
            loading: false,
        });
    };

    const value = {
        ...authState,
        login,
        logout,
        isAuthenticated: authState.authenticated,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
