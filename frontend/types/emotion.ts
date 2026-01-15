/**
 * 감정(Emotion) 관련 공통 타입 정의
 * 
 * 여러 컴포넌트에서 중복 사용되던 감정 타입을 통합했습니다.
 */

// 지원되는 감정 유형
export type EmotionType =
    | 'happy'
    | 'sad'
    | 'angry'
    | 'anxious'
    | 'peaceful'
    | 'excited'
    | 'tired'
    | 'love';

// 감정 레이블 (한국어)
export const EMOTION_LABELS: Record<EmotionType, string> = {
    happy: '행복',
    sad: '슬픔',
    angry: '화남',
    anxious: '불안',
    peaceful: '평온',
    excited: '신남',
    tired: '피곤',
    love: '사랑',
};

// 감정 이모지
export const EMOTION_EMOJIS: Record<EmotionType, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😡',
    anxious: '😰',
    peaceful: '😌',
    excited: '🥳',
    tired: '😴',
    love: '🥰',
};

// 감정 색상
export const EMOTION_COLORS: Record<EmotionType, string> = {
    happy: '#FFD93D',
    sad: '#6B7FD7',
    angry: '#FF6B6B',
    anxious: '#C9B1FF',
    peaceful: '#6BCB77',
    excited: '#FF9F43',
    tired: '#A0AEC0',
    love: '#FF6B9D',
};

// 감정 정보 전체 객체
export interface EmotionInfo {
    type: EmotionType;
    label: string;
    emoji: string;
    color: string;
}

// 감정 정보 가져오기
export const getEmotionInfo = (type: EmotionType): EmotionInfo => ({
    type,
    label: EMOTION_LABELS[type],
    emoji: EMOTION_EMOJIS[type],
    color: EMOTION_COLORS[type],
});

// 감정 통계 타입
export interface EmotionStat {
    emotion: EmotionType;
    label: string;
    count: number;
    percentage: number;
}
