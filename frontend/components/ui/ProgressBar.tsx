import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface ProgressBarProps {
    progress: number; // 0-100
    height?: number;
    showPercentage?: boolean;
    color?: string;
    backgroundColor?: string;
    animated?: boolean;
}

/**
 * 프로그레스 바 컴포넌트
 * - 파일 업로드, AI 처리 등에서 진행률 표시
 */
export const ProgressBar = ({
    progress,
    height = 8,
    showPercentage = false,
    color = Palette.primary[500],
    backgroundColor = Palette.neutral[200],
    animated = true,
}: ProgressBarProps) => {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (animated) {
            Animated.timing(animatedWidth, {
                toValue: progress,
                duration: 300,
                useNativeDriver: false,
            }).start();
        } else {
            animatedWidth.setValue(progress);
        }
    }, [progress, animated]);

    const widthInterpolated = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            <View style={[styles.track, { height, backgroundColor }]}>
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            height,
                            backgroundColor: color,
                            width: widthInterpolated,
                        },
                    ]}
                />
            </View>
            {showPercentage && (
                <Text style={styles.percentage}>{Math.round(progress)}%</Text>
            )}
        </View>
    );
};

/**
 * 인디터미네이트 프로그레스 바 (무한 로딩)
 */
export const IndeterminateProgressBar = ({
    height = 4,
    color = Palette.primary[500],
    backgroundColor = Palette.neutral[200],
}: Omit<ProgressBarProps, 'progress' | 'showPercentage' | 'animated'>) => {
    const translateX = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: 100,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: -100,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <View style={[styles.track, { height, backgroundColor, overflow: 'hidden' }]}>
            <Animated.View
                style={[
                    styles.indeterminateFill,
                    {
                        height,
                        backgroundColor: color,
                        transform: [{ translateX }],
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    track: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    fill: {
        borderRadius: BorderRadius.full,
    },
    indeterminateFill: {
        width: '30%',
        borderRadius: BorderRadius.full,
    },
    percentage: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        fontWeight: FontWeight.medium,
        marginTop: Spacing.xs,
        textAlign: 'right',
    },
});
