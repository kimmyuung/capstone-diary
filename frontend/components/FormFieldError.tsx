/**
 * 폼 필드 에러 표시 컴포넌트
 * 
 * 개별 폼 필드 아래에 에러 메시지를 표시합니다.
 */
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Palette, FontSize, Spacing } from '@/constants/theme';

interface FormFieldErrorProps {
    /** 에러 메시지 */
    error?: string | null;
    /** 표시 여부 */
    visible?: boolean;
}

export const FormFieldError: React.FC<FormFieldErrorProps> = ({
    error,
    visible = true
}) => {
    const opacity = React.useRef(new Animated.Value(0)).current;
    const translateY = React.useRef(new Animated.Value(-5)).current;

    React.useEffect(() => {
        if (error && visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: -5,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [error, visible, opacity, translateY]);

    if (!error) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [{ translateY }]
                }
            ]}
        >
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.text}>{error}</Text>
        </Animated.View>
    );
};

/**
 * 폼 에러 요약 컴포넌트
 * 여러 필드 에러를 한 곳에 표시
 */
interface FormErrorSummaryProps {
    errors: Record<string, string>;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({ errors }) => {
    const errorList = Object.entries(errors);

    if (errorList.length === 0) return null;

    return (
        <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>입력 오류가 있습니다:</Text>
            {errorList.map(([field, message]) => (
                <View key={field} style={styles.summaryItem}>
                    <Text style={styles.summaryBullet}>•</Text>
                    <Text style={styles.summaryText}>{message}</Text>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    // FormFieldError styles
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 4,
    },
    icon: {
        fontSize: 12,
        marginRight: 4,
    },
    text: {
        fontSize: FontSize.xs,
        color: Palette.status.error,
        flex: 1,
    },

    // FormErrorSummary styles
    summaryContainer: {
        backgroundColor: `${Palette.status.error}15`,
        borderLeftWidth: 3,
        borderLeftColor: Palette.status.error,
        padding: Spacing.md,
        borderRadius: 4,
        marginBottom: Spacing.md,
    },
    summaryTitle: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Palette.status.error,
        marginBottom: Spacing.sm,
    },
    summaryItem: {
        flexDirection: 'row',
        marginTop: 4,
    },
    summaryBullet: {
        color: Palette.status.error,
        marginRight: 6,
    },
    summaryText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
        flex: 1,
    },
});

export default FormFieldError;
