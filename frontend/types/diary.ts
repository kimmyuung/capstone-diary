/**
 * 일기(Diary) 관련 공통 타입 정의
 */

import { EmotionType } from './emotion';

// 일기 기본 타입
export interface Diary {
    id: number;
    title: string;
    content: string;
    emotion?: EmotionType;
    emotion_score?: number;
    created_at: string;
    updated_at?: string;
    location_name?: string;
    latitude?: number;
    longitude?: number;
    images?: DiaryImage[];
    tags?: Tag[];
    ai_image?: string;
    transcription?: string;
    reflection_question?: string;
    reflection_answer?: string;
    version?: number;
}

// 일기 이미지
export interface DiaryImage {
    id: number;
    image_url: string;
    ai_prompt?: string;
    created_at: string;
}

// 태그
export interface Tag {
    id: number;
    name: string;
    color?: string;
}

// 일기 생성 DTO
export interface CreateDiaryDto {
    title: string;
    content: string;
    location_name?: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
    created_at?: string;
}

// 일기 수정 DTO
export interface UpdateDiaryDto extends Partial<CreateDiaryDto> {
    version?: number;
}

// 검색 파라미터
export interface DiarySearchParams {
    search?: string;
    emotion?: EmotionType;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
}
