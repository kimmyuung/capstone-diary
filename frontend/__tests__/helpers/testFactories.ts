/**
 * 테스트 팩토리 함수
 * 테스트에서 사용할 mock 데이터를 생성하는 헬퍼 함수들
 */
import { Diary, Tag, DiaryImage } from '@/services/api';

// ============================================================================
// 기본 타임스탬프
// ============================================================================
const DEFAULT_TIMESTAMP = '2024-12-21T10:00:00Z';

// ============================================================================
// Diary 팩토리
// ============================================================================
export interface DiaryOverrides {
    id?: number;
    user?: number;
    title?: string;
    content?: string;
    images?: DiaryImage[];
    emotion?: string | null;
    emotion_score?: number | null;
    emotion_emoji?: string | null;
    emotion_analyzed_at?: string | null;
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    tags?: Tag[];
    created_at?: string;
    updated_at?: string;
}

/**
 * Diary mock 객체 생성
 * @param overrides 기본값을 덮어쓸 속성들
 */
export function createMockDiary(overrides: DiaryOverrides = {}): Diary {
    return {
        id: 1,
        user: 1,
        title: '테스트 일기',
        content: '오늘 하루는 좋았다',
        images: [],
        emotion: 'happy',
        emotion_score: 85,
        emotion_emoji: '😊',
        emotion_analyzed_at: DEFAULT_TIMESTAMP,
        location_name: null,
        latitude: null,
        longitude: null,
        tags: [],
        created_at: DEFAULT_TIMESTAMP,
        updated_at: DEFAULT_TIMESTAMP,
        ...overrides,
    };
}

/**
 * 여러 개의 Diary mock 객체 생성
 * @param count 생성할 개수
 * @param baseOverrides 모든 객체에 적용할 기본 덮어쓰기
 */
export function createMockDiaries(count: number, baseOverrides: DiaryOverrides = {}): Diary[] {
    return Array.from({ length: count }, (_, index) =>
        createMockDiary({
            id: index + 1,
            title: `테스트 일기 ${index + 1}`,
            ...baseOverrides,
        })
    );
}

// ============================================================================
// Tag 팩토리
// ============================================================================
export interface TagOverrides {
    id?: number;
    name?: string;
    color?: string;
    diary_count?: number;
}

export function createMockTag(overrides: TagOverrides = {}): Tag {
    return {
        id: 1,
        name: '테스트 태그',
        color: '#6C63FF',
        diary_count: 0,
        ...overrides,
    };
}

// ============================================================================
// API 응답 팩토리
// ============================================================================
export function createMockCalendarResponse(year: number, month: number) {
    return {
        year,
        month,
        days: {
            [`${year}-${String(month).padStart(2, '0')}-01`]: {
                count: 1,
                emotion: 'happy',
                emoji: '😊',
                diary_ids: [1],
            },
        },
    };
}

export function createMockReportResponse(period: 'week' | 'month' = 'week') {
    return {
        period,
        total_diaries: 5,
        emotion_stats: [
            { emotion: 'happy', label: '행복', count: 3, percentage: 60 },
            { emotion: 'peaceful', label: '평화', count: 2, percentage: 40 },
        ],
    };
}

export function createMockExportResponse() {
    return {
        exported_at: DEFAULT_TIMESTAMP,
        total_diaries: 10,
        diaries: [],
    };
}

// ============================================================================
// 인증 관련 팩토리
// ============================================================================
export function createMockAuthResponse() {
    return {
        access: 'test-access-token',
        refresh: 'test-refresh-token',
    };
}

export function createMockUser() {
    return {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
    };
}

// ============================================================================
// 위치 관련 팩토리
// ============================================================================
export function createMockLocation() {
    return {
        latitude: 37.5665,
        longitude: 126.9780,
        locationName: '서울 중구',
    };
}

export function createMockLocationPermission(granted: boolean = true) {
    return {
        status: granted ? 'granted' : 'denied',
    };
}
