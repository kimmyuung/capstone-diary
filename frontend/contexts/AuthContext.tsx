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

interface AuthContextType extends AuthState {
    login: (username: string, password: string) => Promise<boolean>;
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

    const login = async (username: string, password: string) => {
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
            return true;
        } catch (e) {
            console.error('Login failed:', e);
            return false;
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
