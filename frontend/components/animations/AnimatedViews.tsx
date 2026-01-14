import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInViewProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: ViewStyle;
}

/**
 * 페이드인 애니메이션 래퍼
 */
export const FadeInView = ({
    children,
    delay = 0,
    duration = 300,
    style
}: FadeInViewProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

interface ScaleInViewProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: ViewStyle;
}

/**
 * 스케일인 애니메이션 래퍼
 */
export const ScaleInView = ({
    children,
    delay = 0,
    duration = 200,
    style
}: ScaleInViewProps) => {
    const scale = useRef(new Animated.Value(0.8)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                delay,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity,
                    transform: [{ scale }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

interface SlideInViewProps {
    children: React.ReactNode;
    direction?: 'left' | 'right' | 'up' | 'down';
    delay?: number;
    duration?: number;
    style?: ViewStyle;
}

/**
 * 슬라이드인 애니메이션 래퍼
 */
export const SlideInView = ({
    children,
    direction = 'up',
    delay = 0,
    duration = 300,
    style
}: SlideInViewProps) => {
    const getInitialValue = () => {
        switch (direction) {
            case 'left': return { x: -50, y: 0 };
            case 'right': return { x: 50, y: 0 };
            case 'up': return { x: 0, y: 50 };
            case 'down': return { x: 0, y: -50 };
        }
    };

    const initial = getInitialValue();
    const translateX = useRef(new Animated.Value(initial.x)).current;
    const translateY = useRef(new Animated.Value(initial.y)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateX, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity,
                    transform: [{ translateX }, { translateY }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

interface PulseViewProps {
    children: React.ReactNode;
    duration?: number;
    style?: ViewStyle;
}

/**
 * 펄스 애니메이션 래퍼
 */
export const PulseView = ({
    children,
    duration = 1000,
    style
}: PulseViewProps) => {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.05,
                    duration: duration / 2,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 1,
                    duration: duration / 2,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View style={[style, { transform: [{ scale }] }]}>
            {children}
        </Animated.View>
    );
};
