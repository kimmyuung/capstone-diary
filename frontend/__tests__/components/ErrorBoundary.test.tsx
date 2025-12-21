/**
 * ErrorBoundary 컴포넌트 테스트
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary, ErrorDisplay } from '@/components/ErrorBoundary';

// 에러를 발생시키는 컴포넌트
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <Text>Normal content</Text>;
};

// console.error 억제 (테스트 시 노이즈 방지)
const originalError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});
afterAll(() => {
    console.error = originalError;
});

describe('ErrorBoundary', () => {
    it('renders children when no error occurs', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <Text>Child content</Text>
            </ErrorBoundary>
        );

        expect(getByText('Child content')).toBeTruthy();
    });

    it('renders error UI when error occurs', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(getByText('문제가 발생했습니다')).toBeTruthy();
    });

    it('renders retry button in error state', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(getByText('다시 시도')).toBeTruthy();
    });

    it('renders custom fallback when provided', () => {
        const customFallback = <Text>Custom error message</Text>;

        const { getByText } = render(
            <ErrorBoundary fallback={customFallback}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(getByText('Custom error message')).toBeTruthy();
    });

    it('calls onError callback when error occurs', () => {
        const onErrorMock = jest.fn();

        render(
            <ErrorBoundary onError={onErrorMock}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(onErrorMock).toHaveBeenCalled();
        expect(onErrorMock.mock.calls[0][0]).toBeInstanceOf(Error);
    });
});

describe('ErrorDisplay', () => {
    it('renders default error message', () => {
        const { getByText } = render(<ErrorDisplay />);

        expect(getByText('데이터를 불러오는데 실패했습니다')).toBeTruthy();
    });

    it('renders custom error message', () => {
        const { getByText } = render(
            <ErrorDisplay message="커스텀 에러 메시지" />
        );

        expect(getByText('커스텀 에러 메시지')).toBeTruthy();
    });

    it('renders retry button when onRetry is provided', () => {
        const { getByText } = render(
            <ErrorDisplay onRetry={jest.fn()} />
        );

        expect(getByText('다시 시도')).toBeTruthy();
    });

    it('calls onRetry when retry button is pressed', () => {
        const onRetryMock = jest.fn();
        const { getByText } = render(
            <ErrorDisplay onRetry={onRetryMock} />
        );

        fireEvent.press(getByText('다시 시도'));
        expect(onRetryMock).toHaveBeenCalled();
    });

    it('renders compact version', () => {
        const { getByText } = render(
            <ErrorDisplay compact message="에러" />
        );

        expect(getByText(/에러/)).toBeTruthy();
    });

    it('renders compact retry text', () => {
        const { getByText } = render(
            <ErrorDisplay compact onRetry={jest.fn()} />
        );

        expect(getByText('재시도')).toBeTruthy();
    });
});
