import { api } from './core';
import { UserPreference } from './types';

// ============================================================================
// 사용자 설정 API 서비스
// ============================================================================
export const preferenceService = {
    async get(): Promise<UserPreference> {
        const response = await api.get('/api/preferences/');
        return response.data;
    },

    async update(data: Partial<UserPreference>): Promise<UserPreference> {
        const response = await api.patch('/api/preferences/', data);
        return response.data;
    },

    async getTheme(): Promise<{ theme: string; theme_display: string }> {
        const response = await api.get('/api/preferences/theme/');
        return response.data;
    },

    async setTheme(theme: 'light' | 'dark' | 'system'): Promise<{ theme: string; theme_display: string; message: string }> {
        const response = await api.put('/api/preferences/theme/', { theme });
        return response.data;
    },

    async getStreak(): Promise<{
        current_streak: number;
        max_streak: number;
        last_diary_date: string | null;
        is_streak_active: boolean;
    }> {
        const response = await api.get('/api/preferences/streak/');
        return response.data;
    },
};
