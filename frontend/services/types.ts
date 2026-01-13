export interface Diary {
    id: number;
    user: number;
    title: string;
    content: string;
    images: DiaryImage[];
    emotion: string | null;
    emotion_score: number | null;
    emotion_emoji: string | null;
    emotion_analyzed_at: string | null;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    tags: Tag[];
    created_at: string;
    updated_at: string;
    reflection_question?: string | null;
    reflection_answer?: string | null;
    voice_file?: string | null;
    transcription?: string | null;
    is_transcribing?: boolean;
    keywords?: string[]; // 핵심 키워드
    version?: number; // Optimistic Locking
}

export interface DiaryImage {
    id: number;
    image_url: string;
    ai_prompt: string;
    created_at: string;
}

export interface Tag {
    id: number;
    name: string;
    color: string;
    diary_count?: number;
    created_at?: string;
}

export interface UserPreference {
    theme: 'light' | 'dark' | 'system';
    language: 'ko' | 'en' | 'ja';
    push_enabled: boolean;
    daily_reminder_enabled: boolean;
    daily_reminder_time: string | null;
    auto_emotion_analysis: boolean;
    show_location: boolean;
    updated_at: string;
}

export interface HeatmapData {
    year: number;
    total_entries: number;
    streak: {
        current: number;
        longest: number;
    };
    emotion_colors: Record<string, string>;
    data: Record<string, { count: number; emotion: string | null; color: string } | null>;
    monthly_summary: { month: number; count: number; dominant_emotion: string | null; color: string }[];
}

export interface SummaryResult {
    original_content: string;
    summary: string;
    original_length: number;
    summary_length: number;
    style: string;
}

export interface DiaryTemplate {
    id: number;
    name: string;
    emoji: string;
    description: string;
    content: string;
    template_type: 'system' | 'user';
    template_type_display: string;
    category: string;
    category_display: string;
    use_count: number;
    is_active: boolean;
    is_system: boolean;
    is_owner: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateDiaryRequest {
    title: string;
    content: string;
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    tag_ids?: number[];
}

export interface UpdateDiaryRequest {
    title?: string;
    content?: string;
    location_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    tag_ids?: number[];
    reflection_answer?: string;
    version?: number; // Optimistic Locking
}

export interface EmotionStat {
    emotion: string;
    label: string;
    count: number;
    percentage: number;
}

export interface EmotionReport {
    period: string;
    period_label: string;
    total_diaries: number;
    data_sufficient: boolean;
    recommended_count: number;
    emotion_stats: EmotionStat[];
    dominant_emotion: { emotion: string; label: string } | null;
    insight: string;
}
