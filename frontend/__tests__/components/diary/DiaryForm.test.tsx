import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DiaryForm } from '@/components/diary/DiaryForm';

describe('DiaryForm', () => {
    const mockOnSubmit = jest.fn();

    beforeEach(() => {
        mockOnSubmit.mockClear();
    });

    it('renders correctly', () => {
        const { getByText, getByPlaceholderText } = render(
            <DiaryForm onSubmit={mockOnSubmit} />
        );

        expect(getByText('제목')).toBeTruthy();
        expect(getByText('내용')).toBeTruthy();
        expect(getByPlaceholderText('오늘의 일기 제목을 입력하세요')).toBeTruthy();
        expect(getByText('저장')).toBeTruthy();
    });

    it('validates empty input', async () => {
        const { getByText } = render(
            <DiaryForm onSubmit={mockOnSubmit} />
        );

        fireEvent.press(getByText('저장'));

        await waitFor(() => {
            expect(getByText('제목을 입력해주세요')).toBeTruthy();
            expect(getByText('내용을 입력해주세요')).toBeTruthy();
        }, { timeout: 10000 });

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('calls onSubmit with valid input', async () => {
        const { getByText, getByPlaceholderText } = render(
            <DiaryForm onSubmit={mockOnSubmit} />
        );

        fireEvent.changeText(getByPlaceholderText('오늘의 일기 제목을 입력하세요'), '오늘의 일기');
        fireEvent.changeText(getByPlaceholderText('오늘 하루는 어땠나요? 자유롭게 작성해보세요...'), '오늘은 즐거웠다.');

        fireEvent.press(getByText('저장'));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith('오늘의 일기', '오늘은 즐거웠다.');
        });
    });

    it('shows loading indicator when isLoading is true', () => {
        const { getByTestId, queryByText } = render(
            <DiaryForm onSubmit={mockOnSubmit} isLoading={true} />
        );

        // ActivityIndicator usually doesn't have text, but we can check if button text is gone or check component interaction
        // However, standard ActivityIndicator matches by role or check if button is disabled.
        // In this component, if isLoading, text is hidden.
        expect(queryByText('저장')).toBeNull();
    });

    it('updates character count', () => {
        const { getByText, getByPlaceholderText } = render(
            <DiaryForm onSubmit={mockOnSubmit} />
        );

        const titleInput = getByPlaceholderText('오늘의 일기 제목을 입력하세요');
        fireEvent.changeText(titleInput, '테스트');

        expect(getByText('3/200')).toBeTruthy();
    });
});
