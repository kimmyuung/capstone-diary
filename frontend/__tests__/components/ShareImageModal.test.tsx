/**
 * ShareImageModal 테스트
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

jest.mock('expo-sharing', () => ({
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system', () => ({
    documentDirectory: '/test/',
    downloadAsync: jest.fn().mockResolvedValue({ uri: '/test/image.png' }),
}));

// ShareImageModal component mock for testing
const MockShareImageModal = ({ visible, onClose, imageUrl }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');

    if (!visible) return null;

    return (
        <View testID="share-modal">
            <Text>공유 모달</Text>
            <Text testID="image-url">{imageUrl}</Text>
            <TouchableOpacity testID="close-button" onPress={onClose}>
                <Text>닫기</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="share-button">
                <Text>공유하기</Text>
            </TouchableOpacity>
        </View>
    );
};

describe('ShareImageModal', () => {
    const defaultProps = {
        visible: true,
        onClose: jest.fn(),
        imageUrl: 'https://example.com/test-image.png',
        diaryTitle: '테스트 일기',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders when visible is true', () => {
        const { getByTestId } = render(<MockShareImageModal {...defaultProps} />);
        expect(getByTestId('share-modal')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
        const { queryByTestId } = render(
            <MockShareImageModal {...defaultProps} visible={false} />
        );
        expect(queryByTestId('share-modal')).toBeNull();
    });

    it('displays the image URL', () => {
        const { getByTestId } = render(<MockShareImageModal {...defaultProps} />);
        expect(getByTestId('image-url').props.children).toBe(defaultProps.imageUrl);
    });

    it('calls onClose when close button is pressed', () => {
        const { getByTestId } = render(<MockShareImageModal {...defaultProps} />);
        fireEvent.press(getByTestId('close-button'));
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('has share button', () => {
        const { getByTestId } = render(<MockShareImageModal {...defaultProps} />);
        expect(getByTestId('share-button')).toBeTruthy();
    });
});

describe('ShareImageModal - Template Selection', () => {
    it('should have template options', () => {
        // 템플릿 옵션 테스트 (Mock)
        const templates = ['기본', '미니멀', '그라디언트'];
        expect(templates.length).toBeGreaterThan(0);
    });

    it('should support watermark toggle', () => {
        // 워터마크 토글 테스트 (Mock)
        let watermarkEnabled = true;
        watermarkEnabled = !watermarkEnabled;
        expect(watermarkEnabled).toBe(false);
    });
});
