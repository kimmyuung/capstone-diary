/**
 * Error Boundary 컴포넌트
 * 
 * React 컴포넌트 트리에서 발생하는 오류를 잡아서 처리합니다.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 에러 로깅
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // 외부 오류 보고 (Sentry 등)
        // 이미 Sentry가 설정되어 있다면 자동으로 보고됨

        // 콜백 호출
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // 커스텀 fallback이 제공된 경우
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // 기본 에러 UI
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>😵</Text>
                    <Text style={styles.title}>문제가 발생했습니다</Text>
                    <Text style={styles.message}>
                        예상치 못한 오류가 발생했습니다.{'\n'}
                        문제가 지속되면 앱을 재시작해주세요.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <View style={styles.errorDetails}>
                            <Text style={styles.errorText}>
                                {this.state.error.message}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={this.handleRetry}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

/**
 * 에러 표시용 컴포넌트 (인라인)
 */
interface ErrorDisplayProps {
    message?: string;
    onRetry?: () => void;
    compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    message = '데이터를 불러오는데 실패했습니다',
    onRetry,
    compact = false,
}) => {
    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <Text style={styles.compactMessage}>⚠️ {message}</Text>
                {onRetry && (
                    <TouchableOpacity onPress={onRetry}>
                        <Text style={styles.compactRetry}>재시도</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={styles.displayContainer}>
            <Text style={styles.displayEmoji}>😕</Text>
            <Text style={styles.displayMessage}>{message}</Text>
            {onRetry && (
                <TouchableOpacity
                    style={styles.displayRetryButton}
                    onPress={onRetry}
                >
                    <Text style={styles.displayRetryText}>다시 시도</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // ErrorBoundary 스타일
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: '#FFFBFA',
    },
    emoji: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
        marginBottom: Spacing.sm,
    },
    message: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.lg,
    },
    errorDetails: {
        backgroundColor: Palette.neutral[100],
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.lg,
        maxWidth: '100%',
    },
    errorText: {
        fontSize: FontSize.sm,
        color: Palette.status.error,
        fontFamily: 'monospace',
    },
    retryButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },

    // ErrorDisplay 스타일
    displayContainer: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    displayEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    displayMessage: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    displayRetryButton: {
        backgroundColor: Palette.primary[50],
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
    },
    displayRetryText: {
        color: Palette.primary[600],
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },

    // Compact ErrorDisplay 스타일
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        backgroundColor: Palette.status.warning + '20',
        borderRadius: BorderRadius.md,
    },
    compactMessage: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
    },
    compactRetry: {
        fontSize: FontSize.sm,
        color: Palette.primary[600],
        fontWeight: FontWeight.semibold,
        marginLeft: Spacing.sm,
    },
});
