import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Palette, FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface TypingAnimationProps {
    text?: string;
    color?: string;
}

/**
 * AI 타이핑 애니메이션 컴포넌트
 * - AI가 응답을 생성 중일 때 표시
 */
export const TypingAnimation = ({
    text = 'AI가 생각 중입니다',
    color = Palette.neutral[500]
}: TypingAnimationProps) => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const animation1 = animate(dot1, 0);
        const animation2 = animate(dot2, 200);
        const animation3 = animate(dot3, 400);

        animation1.start();
        animation2.start();
        animation3.start();

        return () => {
            animation1.stop();
            animation2.stop();
            animation3.stop();
        };
    }, []);

    const getDotStyle = (dot: Animated.Value) => ({
        transform: [
            {
                translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -6],
                }),
            },
        ],
        opacity: dot.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1],
        }),
    });

    return (
        <View style={styles.container}>
            <Text style={[styles.text, { color }]}>{text}</Text>
            <View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, { backgroundColor: color }, getDotStyle(dot1)]} />
                <Animated.View style={[styles.dot, { backgroundColor: color }, getDotStyle(dot2)]} />
                <Animated.View style={[styles.dot, { backgroundColor: color }, getDotStyle(dot3)]} />
            </View>
        </View>
    );
};

/**
 * AI 메시지 스켈레톤
 */
export const AIMessageSkeleton = () => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <View style={styles.skeletonContainer}>
            <Animated.View
                style={[
                    styles.skeletonLine,
                    styles.skeletonLineLong,
                    {
                        opacity: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        }),
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.skeletonLine,
                    styles.skeletonLineMedium,
                    {
                        opacity: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        }),
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    {
                        opacity: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        }),
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    text: {
        fontSize: FontSize.sm,
        marginRight: Spacing.sm,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    skeletonContainer: {
        padding: Spacing.lg,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.lg,
        marginVertical: Spacing.sm,
        marginHorizontal: Spacing.md,
    },
    skeletonLine: {
        height: 12,
        backgroundColor: Palette.neutral[200],
        borderRadius: 6,
        marginBottom: Spacing.sm,
    },
    skeletonLineLong: {
        width: '90%',
    },
    skeletonLineMedium: {
        width: '70%',
    },
    skeletonLineShort: {
        width: '40%',
        marginBottom: 0,
    },
});
