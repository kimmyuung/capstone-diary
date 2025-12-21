import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { diaryService, EmotionReport } from '@/services/api';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HIDE_BANNER_KEY = 'hideDataBannerUntil';

// 감정별 색상
const EMOTION_COLORS: Record<string, string> = {
    happy: '#FFD54F',
    sad: '#64B5F6',
    angry: '#EF5350',
    anxious: '#BA68C8',
    peaceful: '#81C784',
    excited: '#FF7043',
    tired: '#90A4AE',
    love: '#EC407A',
};

const EMOTION_EMOJIS: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😡',
    anxious: '😰',
    peaceful: '😌',
    excited: '🥳',
    tired: '😴',
    love: '🥰',
};

// 연간 리포트 타입
interface AnnualReport {
    year: number;
    total_diaries: number;
    monthly_stats: { month: number; count: number; dominant_emotion: string | null }[];
    emotion_stats: { emotion: string; label: string; count: number; percentage: number }[];
}

export default function ReportScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [report, setReport] = useState<EmotionReport | null>(null);
    const [annualReport, setAnnualReport] = useState<AnnualReport | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [showBanner, setShowBanner] = useState(true);

    // 배너 숨김 상태 확인
    const checkBannerVisibility = useCallback(async () => {
        try {
            const hideUntil = await AsyncStorage.getItem(HIDE_BANNER_KEY);
            if (hideUntil) {
                const hideDate = new Date(hideUntil);
                if (new Date() < hideDate) {
                    setShowBanner(false);
                } else {
                    await AsyncStorage.removeItem(HIDE_BANNER_KEY);
                    setShowBanner(true);
                }
            }
        } catch (error) {
            console.error('Failed to check banner visibility:', error);
        }
    }, []);

    // 1주일 숨김 처리
    const hideBannerForWeek = async () => {
        try {
            const hideDate = new Date();
            hideDate.setDate(hideDate.getDate() + 7);
            await AsyncStorage.setItem(HIDE_BANNER_KEY, hideDate.toISOString());
            setShowBanner(false);
        } catch (error) {
            console.error('Failed to hide banner:', error);
        }
    };

    // 리포트 조회
    const fetchReport = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            if (period === 'year') {
                const data = await diaryService.getAnnualReport(selectedYear);
                setAnnualReport(data);
                setReport(null);
            } else {
                const data = await diaryService.getReport(period);
                setReport(data);
                setAnnualReport(null);
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    }, [period, selectedYear, isAuthenticated]);

    useEffect(() => {
        checkBannerVisibility();
        fetchReport();
    }, [checkBannerVisibility, fetchReport]);

    // 월 이름 변환
    const getMonthName = (month: number): string => {
        const months = ['1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'];
        return months[month - 1] || '';
    };

    if (!isAuthenticated) {
        return (
            <LinearGradient
                colors={['#F5E6FF', '#FFF5F3', '#E6F0FF']}
                style={styles.container}
            >
                <View style={styles.notAuthContainer}>
                    <Text style={styles.notAuthEmoji}>📊</Text>
                    <Text style={styles.notAuthTitle}>감정 리포트</Text>
                    <Text style={styles.notAuthSubtitle}>
                        로그인하여 나의 감정 분석을{'\n'}확인해보세요
                    </Text>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => router.push('/login' as any)}
                    >
                        <Text style={styles.loginButtonText}>로그인하기</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Palette.secondary[500]} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>감정 리포트</Text>
                <Text style={styles.headerSubtitle}>AI가 분석한 나의 감정</Text>
            </View>

            {/* 기간 선택 */}
            <View style={styles.periodSelector}>
                <TouchableOpacity
                    style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
                    onPress={() => setPeriod('week')}
                >
                    <Text style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}>
                        일주일
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
                    onPress={() => setPeriod('month')}
                >
                    <Text style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}>
                        한 달
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.periodButton, period === 'year' && styles.periodButtonActive]}
                    onPress={() => setPeriod('year')}
                >
                    <Text style={[styles.periodButtonText, period === 'year' && styles.periodButtonTextActive]}>
                        연간
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 연도 선택 (연간 리포트일 때만) */}
            {period === 'year' && (
                <View style={styles.yearSelector}>
                    <TouchableOpacity
                        style={styles.yearButton}
                        onPress={() => setSelectedYear(prev => prev - 1)}
                    >
                        <IconSymbol name="chevron.left" size={20} color={Palette.neutral[600]} />
                    </TouchableOpacity>
                    <Text style={styles.yearText}>{selectedYear}년</Text>
                    <TouchableOpacity
                        style={styles.yearButton}
                        onPress={() => setSelectedYear(prev => Math.min(prev + 1, new Date().getFullYear()))}
                        disabled={selectedYear >= new Date().getFullYear()}
                    >
                        <IconSymbol
                            name="chevron.right"
                            size={20}
                            color={selectedYear >= new Date().getFullYear() ? Palette.neutral[300] : Palette.neutral[600]}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* 데이터 부족 안내 배너 */}
            {showBanner && report && !report.data_sufficient && period !== 'year' && (
                <View style={styles.dataBanner}>
                    <Text style={styles.dataBannerTitle}>
                        더 많은 일기가 더 정확한 분석을 만들어요
                    </Text>
                    <Text style={styles.dataBannerText}>
                        현재 데이터: {report.total_diaries}개 | 권장: {report.recommended_count}개 이상{'\n'}
                        꾸준히 기록할수록 AI가 당신을 더 잘 이해해요
                    </Text>
                    <TouchableOpacity style={styles.hideBannerButton} onPress={hideBannerForWeek}>
                        <View style={styles.checkbox} />
                        <Text style={styles.hideBannerText}>1주일 동안 보지 않음</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 연간 리포트 */}
            {period === 'year' && annualReport && (
                <>
                    {/* 연간 요약 카드 */}
                    <LinearGradient
                        colors={['#E8F5E9', '#F1F8E9']}
                        style={styles.insightCard}
                    >
                        <Text style={styles.yearSummaryEmoji}>📅</Text>
                        <Text style={styles.insightText}>
                            {selectedYear}년에 총 {annualReport.total_diaries}개의 일기를 작성했어요
                        </Text>
                        {annualReport.emotion_stats.length > 0 && (
                            <Text style={styles.insightCount}>
                                가장 많이 느낀 감정: {EMOTION_EMOJIS[annualReport.emotion_stats[0]?.emotion] || ''} {annualReport.emotion_stats[0]?.label}
                            </Text>
                        )}
                    </LinearGradient>

                    {/* 월별 통계 */}
                    <View style={styles.statsContainer}>
                        <Text style={styles.sectionTitle}>📈 월별 일기 현황</Text>
                        <View style={styles.monthlyGrid}>
                            {annualReport.monthly_stats.map((stat) => (
                                <View key={stat.month} style={styles.monthCard}>
                                    <Text style={styles.monthName}>{getMonthName(stat.month)}</Text>
                                    <Text style={styles.monthCount}>{stat.count}개</Text>
                                    {stat.dominant_emotion && (
                                        <Text style={styles.monthEmotion}>
                                            {EMOTION_EMOJIS[stat.dominant_emotion]}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* 연간 감정 통계 */}
                    {annualReport.emotion_stats.length > 0 && (
                        <View style={styles.statsContainer}>
                            <Text style={styles.sectionTitle}>😊 연간 감정 분포</Text>
                            {annualReport.emotion_stats.map((stat) => (
                                <View key={stat.emotion} style={styles.statRow}>
                                    <View style={styles.statInfo}>
                                        <Text style={styles.statEmoji}>{EMOTION_EMOJIS[stat.emotion]}</Text>
                                        <Text style={styles.statLabel}>{stat.label}</Text>
                                        <Text style={styles.statCount}>{stat.count}회</Text>
                                    </View>
                                    <View style={styles.statBarContainer}>
                                        <View
                                            style={[
                                                styles.statBar,
                                                {
                                                    width: `${stat.percentage}%`,
                                                    backgroundColor: EMOTION_COLORS[stat.emotion],
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.statPercentage}>{stat.percentage}%</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </>
            )}

            {/* 주간/월간 리포트 - 인사이트 카드 */}
            {period !== 'year' && report && report.dominant_emotion && (
                <LinearGradient
                    colors={[
                        EMOTION_COLORS[report.dominant_emotion.emotion] + '20',
                        EMOTION_COLORS[report.dominant_emotion.emotion] + '10',
                    ]}
                    style={styles.insightCard}
                >
                    <Text style={styles.insightEmoji}>
                        {EMOTION_EMOJIS[report.dominant_emotion.emotion]}
                    </Text>
                    <Text style={styles.insightText}>{report.insight}</Text>
                    <Text style={styles.insightCount}>
                        총 {report.total_diaries}개의 일기 분석
                    </Text>
                </LinearGradient>
            )}

            {/* 주간/월간 감정 통계 */}
            {period !== 'year' && report && report.emotion_stats.length > 0 ? (
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>감정 분포</Text>

                    {report.emotion_stats.map((stat) => (
                        <View key={stat.emotion} style={styles.statRow}>
                            <View style={styles.statInfo}>
                                <Text style={styles.statEmoji}>{EMOTION_EMOJIS[stat.emotion]}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                                <Text style={styles.statCount}>{stat.count}회</Text>
                            </View>
                            <View style={styles.statBarContainer}>
                                <View
                                    style={[
                                        styles.statBar,
                                        {
                                            width: `${stat.percentage}%`,
                                            backgroundColor: EMOTION_COLORS[stat.emotion],
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.statPercentage}>{stat.percentage}%</Text>
                        </View>
                    ))}
                </View>
            ) : period !== 'year' && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📝</Text>
                    <Text style={styles.emptyTitle}>아직 분석할 일기가 없어요</Text>
                    <Text style={styles.emptySubtitle}>
                        일기를 작성하면 AI가{'\n'}감정을 분석해드려요
                    </Text>
                    <TouchableOpacity
                        style={styles.writeButton}
                        onPress={() => router.push('/diary/create' as any)}
                    >
                        <Text style={styles.writeButtonText}>일기 작성하기</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 연간 리포트 빈 상태 */}
            {period === 'year' && annualReport && annualReport.total_diaries === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📅</Text>
                    <Text style={styles.emptyTitle}>{selectedYear}년 일기가 없어요</Text>
                    <Text style={styles.emptySubtitle}>
                        다른 연도를 선택하거나{'\n'}새 일기를 작성해보세요
                    </Text>
                </View>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBFA',
    },
    notAuthContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    notAuthEmoji: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    notAuthTitle: {
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
        marginBottom: Spacing.sm,
    },
    notAuthSubtitle: {
        fontSize: FontSize.lg,
        color: Palette.neutral[600],
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: Spacing.xl,
    },
    loginButton: {
        backgroundColor: Palette.secondary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        borderRadius: BorderRadius.full,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },

    // 헤더
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    headerSubtitle: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
        marginTop: Spacing.xs,
    },

    // 기간 선택
    periodSelector: {
        flexDirection: 'row',
        marginHorizontal: Spacing.lg,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.full,
        padding: 4,
        marginBottom: Spacing.lg,
    },
    periodButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.full,
    },
    periodButtonActive: {
        backgroundColor: '#fff',
        ...Shadows.sm,
    },
    periodButtonText: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
        fontWeight: FontWeight.medium,
    },
    periodButtonTextActive: {
        color: Palette.neutral[900],
        fontWeight: FontWeight.semibold,
    },

    // 데이터 부족 배너
    dataBanner: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        backgroundColor: '#FFF8E1',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    dataBannerTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[900],
        marginBottom: Spacing.sm,
    },
    dataBannerText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    hideBannerButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Palette.neutral[400],
        marginRight: Spacing.sm,
    },
    hideBannerText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },

    // 인사이트 카드
    insightCard: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    insightEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    insightText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[900],
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    insightCount: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
    },

    // 통계
    statsContainer: {
        marginHorizontal: Spacing.lg,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[900],
        marginBottom: Spacing.lg,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    statInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
    },
    statEmoji: {
        fontSize: 20,
        marginRight: Spacing.xs,
    },
    statLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
        marginRight: Spacing.xs,
    },
    statCount: {
        fontSize: FontSize.xs,
        color: Palette.neutral[400],
    },
    statBarContainer: {
        flex: 1,
        height: 12,
        backgroundColor: Palette.neutral[100],
        borderRadius: 6,
        marginHorizontal: Spacing.sm,
        overflow: 'hidden',
    },
    statBar: {
        height: '100%',
        borderRadius: 6,
    },
    statPercentage: {
        width: 40,
        textAlign: 'right',
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
    },

    // 빈 상태
    emptyContainer: {
        alignItems: 'center',
        padding: Spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 56,
        marginBottom: Spacing.lg,
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
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.xl,
    },
    writeButton: {
        backgroundColor: Palette.secondary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    writeButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },

    // 연도 선택
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    yearButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    yearText: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
        marginHorizontal: Spacing.xl,
    },

    // 연간 요약
    yearSummaryEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },

    // 월별 그리드
    monthlyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    monthCard: {
        width: '25%',
        padding: 4,
    },
    monthCardInner: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    monthName: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        marginBottom: 2,
    },
    monthCount: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    monthEmotion: {
        fontSize: 16,
        marginTop: 2,
    },
});
