import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ONBOARDING_KEY = 'has_seen_onboarding';

interface OnboardingSlide {
    id: string;
    emoji: string;
    title: string;
    description: string;
    gradient: [string, string];
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        emoji: '📔',
        title: '감성 일기에 오신 것을\n환영합니다',
        description: '하루를 기록하고,\nAI가 당신의 감정을 이해해드려요',
        gradient: ['#FFE5E5', '#FFF5F3'],
    },
    {
        id: '2',
        emoji: '🧠',
        title: 'AI 감정 분석',
        description: '일기를 작성하면 AI가 8가지 감정을\n자동으로 분석해드려요',
        gradient: ['#E8F5E9', '#F3E5F5'],
    },
    {
        id: '3',
        emoji: '🎨',
        title: 'AI 이미지 생성',
        description: '오늘의 감정에 어울리는\n아름다운 그림을 그려드려요',
        gradient: ['#FFF3E0', '#FFECB3'],
    },
    {
        id: '4',
        emoji: '🎙️',
        title: '음성 일기',
        description: '말하는 대로 일기가 작성돼요\n100개 이상의 언어를 지원해요',
        gradient: ['#E3F2FD', '#F3E5F5'],
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            router.replace('/login' as any);
        } catch (error) {
            console.error('Failed to save onboarding status:', error);
            router.replace('/login' as any);
        }
    };

    const renderSlide = ({ item }: { item: OnboardingSlide }) => (
        <View style={styles.slide}>
            <LinearGradient
                colors={item.gradient}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.content}>
                    <View style={styles.emojiContainer}>
                        <Text style={styles.emoji}>{item.emoji}</Text>
                    </View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </LinearGradient>
        </View>
    );

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((_, index) => {
                const inputRange = [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ];
                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });
                const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.dot,
                            { width: dotWidth, opacity: dotOpacity },
                        ]}
                    />
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(index);
                }}
            />

            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>건너뛰기</Text>
            </TouchableOpacity>

            {/* Bottom Controls */}
            <View style={styles.bottomContainer}>
                {renderDots()}

                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <LinearGradient
                        colors={[Palette.primary[400], Palette.primary[500]]}
                        style={styles.nextButtonGradient}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentIndex === slides.length - 1 ? '시작하기' : '다음'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    slide: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    emojiContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        ...Shadows.lg,
    },
    emoji: {
        fontSize: 60,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: 36,
    },
    description: {
        fontSize: FontSize.lg,
        color: Palette.neutral[600],
        textAlign: 'center',
        lineHeight: 28,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: Spacing.xl,
        padding: Spacing.sm,
    },
    skipText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: Spacing.xl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: Palette.primary[500],
        marginHorizontal: 4,
    },
    nextButton: {
        width: SCREEN_WIDTH - 80,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        ...Shadows.colored(Palette.primary[500]),
    },
    nextButtonGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    nextButtonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
});
