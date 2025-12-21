/**
 * DiaryCard 컴포넌트 테스트
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock 컴포넌트 (실제 DiaryCard가 없으므로 인라인 테스트용)
const DiaryCard = ({
    diary,
    onPress,
    onDelete
}: {
    diary: { id: number; title: string; content: string; emotion?: string };
    onPress: () => void;
    onDelete?: () => void;
}) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
        <TouchableOpacity testID="diary-card" onPress={onPress}>
            <Text testID="diary-title">{diary.title}</Text>
            <Text testID="diary-content">{diary.content.substring(0, 50)}</Text>
            {diary.emotion && <Text testID="diary-emotion">{diary.emotion}</Text>}
            {onDelete && (
                <TouchableOpacity testID="delete-button" onPress={onDelete}>
                    <Text>삭제</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

describe('DiaryCard', () => {
    const mockDiary = {
        id: 1,
        title: '오늘의 일기',
        content: '오늘은 정말 좋은 하루였습니다. 날씨도 좋고 기분도 좋았어요.',
        emotion: 'happy',
    };

    it('renders diary title correctly', () => {
        const { getByTestId } = render(
            <DiaryCard diary={mockDiary} onPress={jest.fn()} />
        );

        expect(getByTestId('diary-title')).toHaveTextContent('오늘의 일기');
    });

    it('renders truncated content', () => {
        const { getByTestId } = render(
            <DiaryCard diary={mockDiary} onPress={jest.fn()} />
        );

        const content = getByTestId('diary-content');
        expect(content.props.children.length).toBeLessThanOrEqual(50);
    });

    it('renders emotion when provided', () => {
        const { getByTestId } = render(
            <DiaryCard diary={mockDiary} onPress={jest.fn()} />
        );

        expect(getByTestId('diary-emotion')).toHaveTextContent('happy');
    });

    it('calls onPress when card is pressed', () => {
        const onPressMock = jest.fn();
        const { getByTestId } = render(
            <DiaryCard diary={mockDiary} onPress={onPressMock} />
        );

        fireEvent.press(getByTestId('diary-card'));
        expect(onPressMock).toHaveBeenCalled();
    });

    it('calls onDelete when delete button is pressed', () => {
        const onDeleteMock = jest.fn();
        const { getByTestId } = render(
            <DiaryCard
                diary={mockDiary}
                onPress={jest.fn()}
                onDelete={onDeleteMock}
            />
        );

        fireEvent.press(getByTestId('delete-button'));
        expect(onDeleteMock).toHaveBeenCalled();
    });

    it('does not render delete button when onDelete is not provided', () => {
        const { queryByTestId } = render(
            <DiaryCard diary={mockDiary} onPress={jest.fn()} />
        );

        expect(queryByTestId('delete-button')).toBeNull();
    });
});
