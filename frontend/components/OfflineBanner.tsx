/**
 * 오프라인 배너 컴포넌트 (개선)
 * 
 * 네트워크 연결이 끊기면 화면 상단에 경고 배너를 표시합니다.
 * - 동기화 진행률 표시
 * - 수동 동기화 버튼
 * - 접근성 개선
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Palette, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

export const OfflineBanner: React.FC = () => {
    const { isOffline, pendingRequests, isSyncing, syncQueue } = useOfflineQueue();
    const translateY = React.useRef(new Animated.Value(-100)).current;
    const progressAnim = React.useRef(new Animated.Value(0)).current;
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncProgress, setSyncProgress] = useState(0);

    const pendingCount = pendingRequests.length;
    const showBanner = isOffline || pendingCount > 0;

    // 배너 슬라이드 애니메이션
    useEffect(() => {
        Animated.timing(translateY, {
            toValue: showBanner ? 0 : -100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [showBanner, translateY]);

    // 동기화 진행률 애니메이션
    useEffect(() => {
        if (isSyncing) {
            const interval = setInterval(() => {
                setSyncProgress(prev => Math.min(prev + 10, 90));
            }, 200);
            return () => clearInterval(interval);
        } else {
            setSyncProgress(0);
            if (!isOffline && pendingCount === 0) {
                setLastSyncTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
            }
        }
    }, [isSyncing, isOffline, pendingCount]);

    // 프로그레스 바 애니메이션
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: syncProgress / 100,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [syncProgress, progressAnim]);

    const handleManualSync = async () => {
        if (!isOffline && pendingCount > 0 && !isSyncing) {
            await syncQueue();
        }
    };

    if (!showBanner) {
        return null;
    }

    return (
        <Animated.View
            style={[styles.container, { transform: [{ translateY }] }]}
            accessibilityRole="alert"
            accessibilityLabel={isOffline ? '오프라인 상태' : `${pendingCount}개의 요청 대기 중`}
        >
            <View style={styles.content}>
                <Text style={styles.icon} accessibilityElementsHidden>
                    {isOffline ? '📡' : isSyncing ? '🔄' : '⏳'}
                </Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {isSyncing
                            ? `동기화 중... (${syncProgress}%)`
                            : isOffline
                                ? '오프라인 상태'
                                : '동기화 대기'
                        }
                    </Text>
                    {pendingCount > 0 && !isSyncing && (
                        <Text style={styles.subtitle}>
                            {pendingCount}개의 요청이 대기 중입니다
                        </Text>
                    )}
                    {lastSyncTime && !isOffline && pendingCount === 0 && (
                        <Text style={styles.subtitle}>
                            마지막 동기화: {lastSyncTime}
                        </Text>
                    )}
                </View>

                {/* 수동 동기화 버튼 */}
                {!isOffline && pendingCount > 0 && !isSyncing && (
                    <TouchableOpacity
                        style={styles.syncButton}
                        onPress={handleManualSync}
                        accessibilityRole="button"
                        accessibilityLabel="수동 동기화"
                    >
                        <Text style={styles.syncButtonText}>동기화</Text>
                    </TouchableOpacity>
                )}

                {/* 동기화 중 로딩 */}
                {isSyncing && (
                    <ActivityIndicator size="small" color="#000" style={styles.spinner} />
                )}
            </View>

            {/* 프로그레스 바 */}
            {isSyncing && (
                <View style={styles.progressContainer}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: Palette.status.warning,
        paddingTop: 50,
        paddingBottom: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
    },
    icon: {
        fontSize: 20,
        marginRight: Spacing.sm,
        flexShrink: 0,
    },
    textContainer: {
        flex: 1,
        flexShrink: 1,
    },
    title: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: '#000',
        flexShrink: 1,
    },
    subtitle: {
        fontSize: FontSize.xs,
        color: 'rgba(0,0,0,0.7)',
        marginTop: 2,
        flexShrink: 1,
    },
    syncButton: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        marginLeft: Spacing.sm,
    },
    syncButtonText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: '#000',
    },
    spinner: {
        marginLeft: Spacing.sm,
    },
    progressContainer: {
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        marginTop: Spacing.sm,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 2,
    },
});

export default OfflineBanner;
