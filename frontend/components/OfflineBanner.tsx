/**
 * 오프라인 배너 컴포넌트
 * 
 * 네트워크 연결이 끊기면 화면 상단에 경고 배너를 표시합니다.
 */
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Palette, FontSize, Spacing } from '@/constants/theme';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

export const OfflineBanner: React.FC = () => {
    const { isOffline, pendingRequests, isSyncing } = useOfflineQueue();
    const translateY = React.useRef(new Animated.Value(-60)).current;

    React.useEffect(() => {
        Animated.timing(translateY, {
            toValue: isOffline ? 0 : -60,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOffline, translateY]);

    if (!isOffline && pendingRequests.length === 0) {
        return null;
    }

    const pendingCount = pendingRequests.length;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <View style={styles.content}>
                <Text style={styles.icon}>📡</Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {isSyncing ? '동기화 중...' : '오프라인 상태'}
                    </Text>
                    {pendingCount > 0 && !isSyncing && (
                        <Text style={styles.subtitle}>
                            {pendingCount}개의 요청이 대기 중입니다
                        </Text>
                    )}
                </View>
            </View>
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
        paddingTop: 50, // Safe area 증가
        paddingBottom: Spacing.md,
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
});

export default OfflineBanner;
