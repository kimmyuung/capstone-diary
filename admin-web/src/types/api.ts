export interface StatsData {
    users: {
        total: number;
        new_this_week: number;
    };
    diaries: {
        total: number;
        this_week: number;
    };
    ai_images: {
        total: number;
        this_week: number;
    };
    moderation: {
        pending_flags: number;
        pending_reports: number;
    };
    emotions: {
        distribution: Record<string, number>;
    };
    trends?: {
        daily: Array<{ date: string; diaries: number; users: number }>;
    };
}

export interface PaginationResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface User {
    id: number;
    username: string;
    email: string;
    description?: string;
    // Add other user fields as needed
}

export interface Diary {
    id: number;
    title: string;
    content: string;
    emotion?: string;
    created_at: string;
    // Add other diary fields as needed
}
