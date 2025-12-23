/**
 * DiaryCard 컴포넌트 테스트
 * 리팩토링: 실제 컴포넌트를 사용하도록 수정
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DiaryCard } from '@/components/diary/DiaryCard';
import { createMockDiary } from '../helpers/testFactories';
import { Diary } from '@/services/api';

// expo-router mock
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
    }),
}));

// IconSymbol mock
jest.mock('@/components/ui/icon-symbol', () => ({
    IconSymbol: ({ name }: { name: string }) => null,
}));

describe('DiaryCard', () => {
    const mockDiary: Diary = createMockDiary({
        title: '오늘의 일기',
        content: '오늘은 정말 좋은 하루였습니다. 날씨도 좋고 기분도 좋았어요.',
        emotion: 'happy',
        emotion_emoji: '😊',
        location_name: '카페',
    });

    const mockOnDelete = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('렌더링', () => {
        it('일기 제목 표시', () => {
            const { getByText } = render(
                <DiaryCard diary={mockDiary} onDelete={mockOnDelete} />
            );

            expect(getByText('오늘의 일기')).toBeTruthy();
        });

        it('일기 내용 일부 표시', () => {
            const { getByText } = render(
                <DiaryCard diary={mockDiary} onDelete={mockOnDelete} />
            );

            // 내용의 일부가 표시되어야 함
            expect(getByText(/좋은 하루/)).toBeTruthy();
        });

        it('일기 아이콘 표시', () => {
            const { getByText } = render(
                <DiaryCard diary={mockDiary} onDelete={mockOnDelete} />
            );

            // 📔 아이콘이 표시됨
            expect(getByText('📔')).toBeTruthy();
        });

        it('위치명 표시', () => {
            const { getByText } = render(
                <DiaryCard diary={mockDiary} onDelete={mockOnDelete} />
            );

            expect(getByText(/📍 카페/)).toBeTruthy();
        });

        it('액션 버튼들 표시', () => {
            const { getByText } = render(
                <DiaryCard diary={mockDiary} onDelete={mockOnDelete} />
            );

            expect(getByText('좋아요')).toBeTruthy();
            expect(getByText('수정')).toBeTruthy();
            expect(getByText('AI 이미지')).toBeTruthy();
        });
    });

    describe('조건부 렌더링', () => {
        it('위치가 없으면 위치 배지 미표시', () => {
            const diaryWithoutLocation = createMockDiary({
                title: '위치 없는 일기',
                location_name: null,
            });

            const { queryByText } = render(
                <DiaryCard diary={diaryWithoutLocation} onDelete={mockOnDelete} />
            );

            // 📍가 포함된 텍스트가 없어야 함
            expect(queryByText(/📍/)).toBeNull();
        });

        it('제목이 없으면 기본 제목 표시', () => {
            const diaryWithoutTitle = createMockDiary({
                title: '',
            });

            const { getByText } = render(
                <DiaryCard diary={diaryWithoutTitle} onDelete={mockOnDelete} />
            );

            expect(getByText('제목 없음')).toBeTruthy();
        });
    });
});

