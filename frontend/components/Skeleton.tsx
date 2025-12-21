import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle } from 'react-native';
import { Palette, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * 기본 스켈레톤 컴포넌트
 */
export function Skeleton({
    width = '100%',
    height = 20,
    borderRadius = BorderRadius.md,
    style
}: SkeletonProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            testID="skeleton"
            style={[
                styles.skeleton,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
}

/**
 * 일기 카드 스켈레톤
 */
export function DiaryCardSkeleton() {
    return (
        <View style={styles.diaryCard}>
            <View style={styles.diaryCardHeader}>
                <Skeleton width={50} height={50} borderRadius={25} />
                <View style={styles.diaryCardHeaderText}>
                    <Skeleton width={120} height={16} />
                    <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
                </View>
            </View>
            <Skeleton width="100%" height={16} style={{ marginTop: 12 }} />
            <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="60%" height={16} style={{ marginTop: 8 }} />
        </View>
    );
}

/**
 * 일기 목록 스켈레톤
 */
export function DiaryListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: count }).map((_, index) => (
                <DiaryCardSkeleton key={index} />
            ))}
        </View>
    );
}

/**
 * 갤러리 이미지 스켈레톤
 */
export function GalleryImageSkeleton() {
    return <Skeleton width="100%" height={150} borderRadius={BorderRadius.lg} />;
}

/**
 * 갤러리 그리드 스켈레톤
 */
export function GalleryGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <View style={styles.galleryGrid}>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={styles.galleryItem}>
                    <GalleryImageSkeleton />
                </View>
            ))}
        </View>
    );
}

/**
 * 리포트 스켈레톤
 */
export function ReportSkeleton() {
    return (
        <View style={styles.reportContainer}>
            {/* 인사이트 카드 */}
            <Skeleton width="100%" height={120} borderRadius={BorderRadius.xl} />

            {/* 통계 바 */}
            <View style={styles.statsContainer}>
                <Skeleton width="100%" height={20} style={{ marginTop: 24 }} />
                {Array.from({ length: 4 }).map((_, index) => (
                    <View key={index} style={styles.statRow}>
                        <Skeleton width={40} height={40} borderRadius={20} />
                        <Skeleton width="60%" height={12} style={{ marginLeft: 12 }} />
                        <Skeleton width={40} height={12} style={{ marginLeft: 'auto' }} />
                    </View>
                ))}
            </View>
        </View>
    );
}

/**
 * 캘린더 스켈레톤
 */
export function CalendarSkeleton() {
    return (
        <View style={styles.calendarContainer}>
            {/* 월 헤더 */}
            <View style={styles.calendarHeader}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <Skeleton width={120} height={24} />
                <Skeleton width={40} height={40} borderRadius={20} />
            </View>

            {/* 요일 헤더 */}
            <View style={styles.weekdayRow}>
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} width={30} height={16} />
                ))}
            </View>

            {/* 날짜 그리드 */}
            {Array.from({ length: 5 }).map((_, row) => (
                <View key={row} style={styles.weekRow}>
                    {Array.from({ length: 7 }).map((_, col) => (
                        <Skeleton key={col} width={36} height={36} borderRadius={18} />
                    ))}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: Palette.neutral[200],
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    diaryCard: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: 16,
        marginBottom: 12,
    },
    diaryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    diaryCardHeaderText: {
        marginLeft: 12,
        flex: 1,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    galleryItem: {
        width: '33.33%',
        padding: 4,
    },
    reportContainer: {
        paddingHorizontal: 16,
    },
    statsContainer: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: 16,
        marginTop: 16,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    calendarContainer: {
        paddingHorizontal: 16,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
});
