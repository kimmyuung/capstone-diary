import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { diaryService, Diary } from '@/services/api';
import { DiaryCard } from '@/components/diary/DiaryCard';
import { DiaryListSkeleton } from '@/components/Skeleton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DiaryListScreen() {
    const router = useRouter();
    const { isAuthenticated, logout } = useAuth();
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDiaries = useCallback(async () => {
        try {
            const data = await diaryService.getAll();
            setDiaries(data);
        } catch (err) {
            console.error('Failed to fetch diaries:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchDiaries();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, fetchDiaries]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDiaries();
        setRefreshing(false);
    };

    const handleDelete = async (id: number) => {
        Alert.alert('일기 삭제', '정말로 이 일기를 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await diaryService.delete(id);
                        setDiaries((prev) => prev.filter((d) => d.id !== id));
                    } catch (err) {
                        Alert.alert('오류', '삭제에 실패했습니다');
                    }
                },
            },
        ]);
    };

    // 미인증 상태
    if (!isAuthenticated) {
        return (
            <LinearGradient
                colors={['#FFE5E5', '#FFF5F3', '#F5E6FF']}
                style={styles.gradientContainer}
            >
                <View style={styles.welcomeContainer}>
                    <View style={styles.welcomeIcon}>
                        <Text style={styles.welcomeEmoji}>✨</Text>
                    </View>
                    <Text style={styles.welcomeTitle}>감성 일기</Text>
                    <Text style={styles.welcomeSubtitle}>
                        당신의 소중한 하루를{'\n'}AI와 함께 기록하세요
                    </Text>
                    <TouchableOpacity
                        style={styles.welcomeButton}
                        onPress={() => router.push('/login' as any)}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={[Palette.primary[400], Palette.primary[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.welcomeButtonGradient}
                        >
                            <Text style={styles.welcomeButtonText}>시작하기</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    // 로딩 상태
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>나의 일기</Text>
                </View>
                <DiaryListSkeleton count={4} />
            </View>
        );
    }

    // 빈 상태
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Text style={styles.emptyEmoji}>📝</Text>
            </View>
            <Text style={styles.emptyTitle}>아직 작성된 일기가 없어요</Text>
            <Text style={styles.emptySubtitle}>
                오늘 하루를 기록해볼까요?
            </Text>
            <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/diary/create' as any)}
            >
                <Text style={styles.emptyButtonText}>첫 일기 작성하기</Text>
            </TouchableOpacity>
        </View>
    );

    // 헤더
    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.greeting}>안녕하세요 👋</Text>
                <Text style={styles.headerTitle}>나의 일기</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={Palette.neutral[600]} />
            </TouchableOpacity>
        </View>
    );

    // 통계 카드
    const renderStats = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statCard}>
                <Text style={styles.statNumber}>{diaries.length}</Text>
                <Text style={styles.statLabel}>총 일기</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAccent]}>
                <Text style={[styles.statNumber, styles.statNumberAccent]}>
                    {diaries.filter(d => {
                        const today = new Date();
                        const diaryDate = new Date(d.created_at);
                        return diaryDate.toDateString() === today.toDateString();
                    }).length}
                </Text>
                <Text style={[styles.statLabel, styles.statLabelAccent]}>오늘</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                    {diaries.reduce((acc, d) => acc + d.images.length, 0)}
                </Text>
                <Text style={styles.statLabel}>AI 이미지</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={diaries}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <DiaryCard diary={item} onDelete={() => handleDelete(item.id)} />
                )}
                ListHeaderComponent={
                    <>
                        {renderHeader()}
                        {renderStats()}
                        <Text style={styles.sectionTitle}>최근 일기</Text>
                    </>
                }
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Palette.primary[500]}
                    />
                }
            />

            {/* FAB 버튼 */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/diary/create' as any)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={[Palette.primary[400], Palette.primary[500]]}
                    style={styles.fabGradient}
                >
                    <IconSymbol name="plus" size={28} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBFA',
    },
    gradientContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBFA',
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },

    // 헤더
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: Spacing.lg,
    },
    greeting: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        marginBottom: Spacing.xs,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    logoutButton: {
        padding: Spacing.sm,
    },

    // 통계
    statsContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        ...Shadows.sm,
    },
    statCardAccent: {
        backgroundColor: Palette.primary[500],
    },
    statNumber: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    statNumberAccent: {
        color: '#fff',
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        marginTop: Spacing.xs,
    },
    statLabelAccent: {
        color: 'rgba(255,255,255,0.8)',
    },

    // 섹션
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
        marginBottom: Spacing.md,
    },

    // 환영 화면
    welcomeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    welcomeIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        ...Shadows.lg,
    },
    welcomeEmoji: {
        fontSize: 60,
    },
    welcomeTitle: {
        fontSize: FontSize.display,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
        marginBottom: Spacing.sm,
    },
    welcomeSubtitle: {
        fontSize: FontSize.lg,
        color: Palette.neutral[600],
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: Spacing.xxl,
    },
    welcomeButton: {
        width: SCREEN_WIDTH - 80,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        ...Shadows.colored(Palette.primary[500]),
    },
    welcomeButtonGradient: {
        paddingVertical: Spacing.lg + 2,
        alignItems: 'center',
    },
    welcomeButtonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },

    // 빈 상태
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Palette.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emptyEmoji: {
        fontSize: 48,
    },
    emptyTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
        marginBottom: Spacing.xl,
    },
    emptyButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },

    // FAB
    fab: {
        position: 'absolute',
        right: Spacing.xl,
        bottom: Spacing.xxl,
        borderRadius: 30,
        overflow: 'hidden',
        ...Shadows.colored(Palette.primary[500]),
    },
    fabGradient: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
