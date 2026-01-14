import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
} from 'react-native';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface AIGenerationProgressProps {
    isVisible: boolean;
    currentStep?: number; // 0-3
    onComplete?: () => void;
}

const steps = [
    { label: '감정 분석 중...', emoji: '🧠', progress: 10 },
    { label: '프롬프트 생성 중...', emoji: '✍️', progress: 30 },
    { label: 'AI 이미지 생성 중...', emoji: '🎨', progress: 60 },
    { label: '이미지 저장 중...', emoji: '💾', progress: 90 },
];

export function AIGenerationProgress({
    isVisible,
    currentStep = 0,
    onComplete
}: AIGenerationProgressProps) {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isVisible) {
            // Progress animation
            const targetProgress = steps[currentStep]?.progress || 0;
            Animated.timing(progressAnim, {
                toValue: targetProgress,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }).start();

            // Pulse animation for emoji
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            progressAnim.setValue(0);
            pulseAnim.setValue(1);
        }
    }, [isVisible, currentStep]);

    if (!isVisible) return null;

    const currentStepData = steps[currentStep] || steps[0];

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                {/* Emoji with pulse */}
                <Animated.View style={[
                    styles.emojiContainer,
                    { transform: [{ scale: pulseAnim }] }
                ]}>
                    <Text style={styles.emoji}>{currentStepData.emoji}</Text>
                </Animated.View>

                {/* Step label */}
                <Text style={styles.stepLabel}>{currentStepData.label}</Text>

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            { width: progressWidth }
                        ]}
                    />
                </View>

                {/* Progress percentage */}
                <Text style={styles.progressText}>
                    {currentStepData.progress}% 완료
                </Text>

                {/* Step indicators */}
                <View style={styles.stepsContainer}>
                    {steps.map((step, index) => (
                        <View
                            key={index}
                            style={[
                                styles.stepDot,
                                index <= currentStep && styles.stepDotActive
                            ]}
                        />
                    ))}
                </View>

                {/* Time estimate */}
                <Text style={styles.timeEstimate}>
                    ⏱️ 약 {currentStep < 2 ? '15-20' : '5-10'}초 소요
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        width: '85%',
        maxWidth: 320,
        alignItems: 'center',
    },
    emojiContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Palette.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emoji: {
        fontSize: 40,
    },
    stepLabel: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: Palette.neutral[100],
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    progressBar: {
        height: '100%',
        backgroundColor: Palette.primary[500],
        borderRadius: 4,
    },
    progressText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginBottom: Spacing.lg,
    },
    stepsContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Palette.neutral[200],
    },
    stepDotActive: {
        backgroundColor: Palette.primary[500],
    },
    timeEstimate: {
        fontSize: FontSize.sm,
        color: Palette.neutral[400],
    },
});

export default AIGenerationProgress;
