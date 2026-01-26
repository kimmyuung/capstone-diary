import { api } from './core';
import { Diary, DiaryImage, Tag, CreateDiaryRequest, UpdateDiaryRequest, EmotionReport, HeatmapData } from './types';

// ============================================================================
// 일기 API 서비스
// ============================================================================
export const diaryService = {
    // 일기 목록 조회
    async getAll(): Promise<Diary[]> {
        const response = await api.get('/api/diaries/');
        return response.data;
    },

    // 일기 검색 (필터 포함)
    async search(filters: {
        search?: string;           // 제목 검색
        contentSearch?: string;    // 본문 검색
        q?: string;                // 통합 검색 (제목+본문)
        emotion?: string;
        startDate?: string;
        endDate?: string;
        tag?: number;              // 태그 ID로 필터
        exactMatch?: boolean;      // 정확한 단어 일치 여부 (Option A)
    }): Promise<Diary[]> {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.contentSearch) params.append('content_search', filters.contentSearch);
        if (filters.q) params.append('q', filters.q);
        if (filters.emotion) params.append('emotion', filters.emotion);
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        if (filters.tag) params.append('tag', filters.tag.toString());
        if (filters.exactMatch) params.append('exact_match', 'true');

        const queryString = params.toString();
        const url = queryString ? `/api/diaries/?${queryString}` : '/api/diaries/';
        const response = await api.get(url);
        return response.data.results ?? response.data;
    },

    // 일기 상세 조회
    async getById(id: number): Promise<Diary> {
        const response = await api.get(`/api/diaries/${id}/`);
        return response.data;
    },

    // 일기 작성
    async create(data: CreateDiaryRequest): Promise<Diary> {
        const response = await api.post('/api/diaries/', data);
        return response.data;
    },

    // 일기 수정
    async update(id: number, data: UpdateDiaryRequest): Promise<Diary> {
        const response = await api.put(`/api/diaries/${id}/`, data);
        return response.data;
    },

    // 일기 삭제
    async delete(id: number): Promise<void> {
        await api.delete(`/api/diaries/${id}/`);
    },

    // AI 이미지 생성 (Async)
    async generateImage(id: number): Promise<any> {
        const response = await api.post(`/api/diaries/${id}/generate-image/`);
        return response.data;
    },

    // 유사한 일기 추천 (Vector Search)
    async getSimilarDiaries(id: number): Promise<Partial<Diary>[]> {
        try {
            const response = await api.get(`/api/diaries/${id}/similar/`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch similar diaries:', error);
            return [];
        }
    },

    // 일기 통계 (리포트) 조회
    async getReport(period: 'week' | 'month' = 'week'): Promise<EmotionReport> {
        const response = await api.get(`/api/reports/weekly/?period=${period}`);
        return response.data;
    },

    // 캘린더 월별 요약 조회
    async getCalendar(year: number, month: number): Promise<{
        year: number;
        month: number;
        days: Record<string, { count: number; emotion: string | null; emoji: string; diary_ids: number[] }>;
    }> {
        const response = await api.get(`/api/reports/calendar/?year=${year}&month=${month}`);
        return response.data;
    },

    // 특정 날짜 일기 검색
    async getByDate(date: string): Promise<Diary[]> {
        const response = await api.get(`/api/diaries/?start_date=${date}&end_date=${date}`);
        return response.data;
    },

    // 연간 리포트
    async getAnnualReport(year: number): Promise<{
        year: number;
        total_diaries: number;
        monthly_stats: { month: number; count: number; dominant_emotion: string | null }[];
        emotion_stats: { emotion: string; label: string; count: number; percentage: number }[];
    }> {
        const response = await api.get(`/api/reports/annual/?year=${year}`);
        return response.data;
    },

    // 감정 히트맵
    async getHeatmap(year: number): Promise<HeatmapData> {
        const response = await api.get(`/api/reports/heatmap/?year=${year}`);
        return response.data;
    },

    // 이미지 갤러리
    async getGallery(): Promise<{
        total_images: number;
        images: { id: number; image_url: string; ai_prompt: string; created_at: string; diary_id: number; diary_title: string; diary_date: string }[];
    }> {
        const response = await api.get('/api/gallery/images/');
        return response.data;
    },

    // 일기 내보내기 (JSON)
    async exportDiaries(): Promise<{
        metadata: { username: string; email: string; export_date: string; version: string };
        diaries: Diary[];
        // ... tags/prefs types omitted for brevity if not used here explicitly, but API returns them
        // using 'any' or simplified types if needed, or expanding types.ts
        tags: Tag[];
        preferences: any;
        templates: any;
    }> {
        const response = await api.get('/api/export/json/');
        return response.data;
    },

    // 일기 내보내기 (PDF)
    async exportPdf(): Promise<Blob> {
        const response = await api.get('/api/export/pdf/', {
            responseType: 'blob',
        });
        return response.data;
    },

    // 위치 정보 일기 목록
    async getLocations(): Promise<{
        total_locations: number;
        locations: { id: number; title: string; location_name: string; latitude: number; longitude: number; emotion: string | null; emotion_emoji: string; created_at: string }[];
    }> {
        const response = await api.get('/api/diaries/locations/');
        return response.data;
    },

    // 음성 파일 업로드
    async uploadVoice(id: number, uri: string): Promise<Diary> {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'voice.m4a';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `audio/${match[1]}` : 'audio/m4a';

        // @ts-ignore: FormData in React Native expects name, type, uri
        formData.append('voice_file', { uri, name: filename, type });

        const response = await api.patch(`/api/diaries/${id}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};

// ============================================================================
// 태그 API 서비스
// ============================================================================
export const tagService = {
    async getAll(): Promise<Tag[]> {
        const response = await api.get('/api/tags/');
        return response.data;
    },

    async create(data: { name: string; color?: string }): Promise<Tag> {
        const response = await api.post('/api/tags/', data);
        return response.data;
    },

    async update(id: number, data: { name?: string; color?: string }): Promise<Tag> {
        const response = await api.patch(`/api/tags/${id}/`, data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/api/tags/${id}/`);
    },

    async getDiaries(id: number): Promise<{
        tag: Tag;
        diary_count: number;
        diaries: { id: number; title: string; emotion: string | null; emotion_emoji: string; created_at: string }[];
    }> {
        const response = await api.get(`/api/tags/${id}/diaries/`);
        return response.data;
    },

    async getPopular(): Promise<{ tags: Tag[] }> {
        const response = await api.get('/api/tags/popular/');
        return response.data;
    },
};
