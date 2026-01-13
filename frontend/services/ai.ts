import { api } from './core';
import { SummaryResult } from './types';

// ============================================================================
// AI 도우미 API 서비스
// ============================================================================
export const aiService = {
    // 일기 요약
    async summarize(content: string, style: 'default' | 'short' | 'bullet' = 'default'): Promise<SummaryResult> {
        const response = await api.post('/api/summarize/', { content, style });
        return response.data;
    },

    // 제목 자동 제안
    async suggestTitle(content: string): Promise<{ suggested_title: string }> {
        const response = await api.post('/api/suggest-title/', { content });
        return response.data;
    },
};

// ============================================================================
// 음성-텍스트 변환 API 서비스
// ============================================================================
export const speechService = {
    // 음성을 텍스트로 변환
    async transcribe(audioFile: FormData, language: string = 'ko'): Promise<{ text: string; language: string; summary: string }> {
        audioFile.append('language', language);
        const response = await api.post('/api/transcribe/', audioFile, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // 지원 언어 목록
    async getSupportedLanguages(): Promise<{ languages: Record<string, string>; note: string }> {
        const response = await api.get('/api/supported-languages/');
        return response.data;
    },
};
