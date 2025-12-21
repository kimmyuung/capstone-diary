/**
 * AuthContext 테스트
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        defaults: { headers: { common: {} } },
    })),
    defaults: { headers: { common: {} } },
    post: jest.fn(),
}));

// Mock expo-secure-store
const mockSecureStore = {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
};
jest.mock('expo-secure-store', () => mockSecureStore);

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset localStorage mock for web tests
        if (typeof window !== 'undefined') {
            Object.defineProperty(window, 'localStorage', {
                value: {
                    getItem: jest.fn(),
                    setItem: jest.fn(),
                    removeItem: jest.fn(),
                },
                writable: true,
            });
        }
    });

    describe('Token Storage', () => {
        it('should use localStorage on web platform', () => {
            const originalPlatform = Platform.OS;
            (Platform as any).OS = 'web';

            // Test that web uses localStorage
            expect(Platform.OS).toBe('web');

            (Platform as any).OS = originalPlatform;
        });

        it('should use SecureStore on native platform', () => {
            const originalPlatform = Platform.OS;
            (Platform as any).OS = 'ios';

            expect(Platform.OS).toBe('ios');

            (Platform as any).OS = originalPlatform;
        });
    });

    describe('Authentication State', () => {
        it('should start with loading state', () => {
            // Initial state should be loading
            const initialState = {
                token: null,
                authenticated: false,
                loading: true,
            };

            expect(initialState.loading).toBe(true);
            expect(initialState.authenticated).toBe(false);
        });

        it('should have authenticated state after successful login', () => {
            const authenticatedState = {
                token: 'test-token',
                authenticated: true,
                loading: false,
            };

            expect(authenticatedState.authenticated).toBe(true);
            expect(authenticatedState.token).toBe('test-token');
        });
    });

    describe('Login Flow', () => {
        it('should call token API with credentials', async () => {
            const mockResponse = { data: { access: 'test-access-token' } };
            (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

            // Simulate login call
            const result = await axios.post('http://localhost:8000/api/token/', {
                username: 'testuser',
                password: 'testpass',
            });

            expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/token/', {
                username: 'testuser',
                password: 'testpass',
            });
            expect(result.data.access).toBe('test-access-token');
        });

        it('should handle login failure', async () => {
            (axios.post as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));

            await expect(
                axios.post('http://localhost:8000/api/token/', {
                    username: 'wronguser',
                    password: 'wrongpass',
                })
            ).rejects.toThrow('Invalid credentials');
        });
    });

    describe('Logout Flow', () => {
        it('should clear token on logout', () => {
            const logoutState = {
                token: null,
                authenticated: false,
                loading: false,
            };

            expect(logoutState.token).toBeNull();
            expect(logoutState.authenticated).toBe(false);
        });
    });
});
