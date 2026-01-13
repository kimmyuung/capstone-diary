import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReflectionCard from '@/components/ReflectionCard';
import { diaryService } from '@/services/diary';

// Mock diaryService
jest.mock('@/services/diary', () => ({
    diaryService: {
        update: jest.fn(),
    },
}));

describe('ReflectionCard', () => {
    // Mock Diary object
    const mockDiary: any = {
        id: 1,
        reflection_question: '오늘 가장 기억에 남는 순간은 무엇인가요?',
        reflection_answer: null,
    };
    const mockOnUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with a question', () => {
        const { getByText, getByPlaceholderText } = render(
            <ReflectionCard
                diary={mockDiary}
                onUpdate={mockOnUpdate}
            />
        );

        expect(getByText('오늘의 회고')).toBeTruthy();
        expect(getByText('오늘 가장 기억에 남는 순간은 무엇인가요?')).toBeTruthy();
        expect(getByPlaceholderText('나의 답변을 적어보세요...')).toBeTruthy();
    });

    it('does not render if no question is provided', () => {
        const diaryNoQuestion = { ...mockDiary, reflection_question: null };
        const { queryByText } = render(
            <ReflectionCard
                diary={diaryNoQuestion}
                onUpdate={mockOnUpdate}
            />
        );

        expect(queryByText('오늘의 회고')).toBeNull();
    });

    it('handles answer submission correctly', async () => {
        const { getByPlaceholderText, getByText } = render(
            <ReflectionCard
                diary={mockDiary}
                onUpdate={mockOnUpdate}
            />
        );

        const input = getByPlaceholderText('나의 답변을 적어보세요...');
        const saveButton = getByText('저장하기');

        fireEvent.changeText(input, '친구들과 맛있는 저녁을 먹은 것입니다.');
        fireEvent.press(saveButton);

        await waitFor(() => {
            expect(diaryService.update).toHaveBeenCalledWith(1, {
                reflection_answer: '친구들과 맛있는 저녁을 먹은 것입니다.',
            });
            // Note: Component implementation might not call onUpdate directly
        });
    });
});
