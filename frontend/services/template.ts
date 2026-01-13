import { api } from './core';
import { DiaryTemplate } from './types';

// ============================================================================
// 일기 템플릿 API 서비스
// ============================================================================
export const templateService = {
    // 모든 템플릿 조회
    async getAll(): Promise<DiaryTemplate[]> {
        const response = await api.get('/api/templates/');
        return response.data;
    },

    // 템플릿 상세 조회
    async getById(id: number): Promise<DiaryTemplate> {
        const response = await api.get(`/api/templates/${id}/`);
        return response.data;
    },

    // 커스텀 템플릿 생성
    async create(data: { name: string; emoji?: string; description: string; content: string; category?: string }): Promise<DiaryTemplate> {
        const response = await api.post('/api/templates/', data);
        return response.data;
    },

    // 템플릿 수정
    async update(id: number, data: Partial<DiaryTemplate>): Promise<DiaryTemplate> {
        const response = await api.patch(`/api/templates/${id}/`, data);
        return response.data;
    },

    // 템플릿 삭제
    async delete(id: number): Promise<void> {
        await api.delete(`/api/templates/${id}/`);
    },

    // 템플릿 사용
    async use(id: number): Promise<{ id: number; name: string; emoji: string; content: string; use_count: number; message: string }> {
        const response = await api.post(`/api/templates/${id}/use/`);
        return response.data;
    },

    // 시스템 템플릿 조회
    async getSystem(): Promise<{ count: number; templates: DiaryTemplate[] }> {
        const response = await api.get('/api/templates/system/');
        return response.data;
    },

    // 내 템플릿 조회
    async getMy(): Promise<{ count: number; templates: DiaryTemplate[] }> {
        const response = await api.get('/api/templates/my/');
        return response.data;
    },

    // 인기 템플릿 조회
    async getPopular(): Promise<{ templates: DiaryTemplate[] }> {
        const response = await api.get('/api/templates/popular/');
        return response.data;
    },

    // 카테고리별 템플릿 조회
    async getByCategory(category: string): Promise<{ category: string; count: number; templates: DiaryTemplate[] }> {
        const response = await api.get(`/api/templates/by-category/${category}/`);
        return response.data;
    },

    // AI로 템플릿 생성 (미리보기)
    async generate(topic: string, style: 'default' | 'simple' | 'detailed' = 'default'): Promise<{
        name: string;
        emoji: string;
        description: string;
        content: string;
        message: string;
    }> {
        const response = await api.post('/api/templates/generate/', { topic, style });
        return response.data;
    },

    // AI로 생성된 템플릿 저장
    async saveGenerated(data: { name: string; emoji: string; description: string; content: string }): Promise<{
        template: DiaryTemplate;
        message: string;
    }> {
        const response = await api.post('/api/templates/save-generated/', data);
        return response.data;
    },
};
