import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { diaryService, Diary } from '@/services/api';
import { DiaryCard } from '@/components/diary/DiaryCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

type CalendarData = Record<string, { count: number; emotion: string | null; emoji: string; diary_ids: number[] }>;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export default function CalendarScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData>({});
    const [selectedDiaries, setSelectedDiaries] = useState<Diary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 달력 데이터 로드
    const fetchCalendarData = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await diaryService.getCalendar(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1
            );
            setCalendarData(data.days);
        } catch (err) {
            console.error('Failed to fetch calendar:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, currentDate]);

    useEffect(() => {
        setLoading(true);
        fetchCalendarData();
    }, [fetchCalendarData]);

    // 날짜 선택 시 해당 날짜 일기 로드
    const handleDateSelect = async (dateStr: string) => {
        setSelectedDate(dateStr);
        try {
            const diaries = await diaryService.getByDate(dateStr);
            setSelectedDiaries(diaries);
        } catch (err) {
            console.error('Failed to fetch diaries:', err);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCalendarData();
        if (selectedDate) {
            const diaries = await diaryService.getByDate(selectedDate);
            setSelectedDiaries(diaries);
        }
        setRefreshing(false);
    };

    // 이전/다음 달 이동
    const goToPrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
        setSelectedDiaries([]);
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
        setSelectedDiaries([]);
    };

    // 달력 날짜 생성
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days: (number | null)[] = [];

        // 빈 칸 (이전 달)
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // 현재 달 날짜
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    // 미인증 상태
    if (!isAuthenticated) {
        return (
            <LinearGradient colors={['#FFE5E5', '#FFF5F3', '#F5E6FF']} style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.emptyTitle}>로그인이 필요합니다</Text>
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
                <ActivityIndicator size="large" color={Palette.primary[500]} />
            </View>
        );
    }

    const calendarDays = generateCalendarDays();

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.primary[500]} />
            }
        >
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📅 캘린더</Text>
                <Text style={styles.headerSubtitle}>날짜를 선택하여 일기를 확인하세요</Text>
            </View>

            {/* 월 네비게이션 */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                    <IconSymbol name="chevron.left" size={24} color={Palette.neutral[600]} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                    {currentDate.getFullYear()}년 {MONTHS[currentDate.getMonth()]}
                </Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <IconSymbol name="chevron.right" size={24} color={Palette.neutral[600]} />
                </TouchableOpacity>
            </View>

            {/* 달력 */}
            <View style={styles.calendarCard}>
                {/* 요일 헤더 */}
                <View style={styles.weekdayRow}>
                    {WEEKDAYS.map((day, idx) => (
                        <View key={day} style={styles.weekdayCell}>
                            <Text style={[
                                styles.weekdayText,
                                idx === 0 && styles.sundayText,
                                idx === 6 && styles.saturdayText
                            ]}>
                                {day}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* 날짜 그리드 */}
                <View style={styles.daysGrid}>
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <View key={`empty-${index}`} style={styles.dayCell} />;
                        }

                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayData = calendarData[dateStr];
                        const isSelected = selectedDate === dateStr;
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const dayOfWeek = (new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay());

                        return (
                            <TouchableOpacity
                                key={dateStr}
                                style={[
                                    styles.dayCell,
                                    isSelected && styles.selectedDay,
                                    isToday && styles.todayDay,
                                ]}
                                onPress={() => handleDateSelect(dateStr)}
                            >
                                <Text style={[
                                    styles.dayNumber,
                                    isSelected && styles.selectedDayText,
                                    dayOfWeek === 0 && styles.sundayText,
                                    dayOfWeek === 6 && styles.saturdayText,
                                ]}>
                                    {day}
                                </Text>
                                {dayData && (
                                    <Text style={styles.dayEmoji}>{dayData.emoji || '📝'}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* 선택된 날짜의 일기 목록 */}
            {selectedDate && (
                <View style={styles.diariesSection}>
                    <Text style={styles.sectionTitle}>
                        {selectedDate} 일기 ({selectedDiaries.length}개)
                    </Text>
                    {selectedDiaries.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📭</Text>
                            <Text style={styles.emptyText}>이 날짜에 작성된 일기가 없습니다</Text>
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={() => router.push('/diary/create' as any)}
                            >
                                <Text style={styles.createButtonText}>일기 작성하기</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        selectedDiaries.map((diary) => (
                            <DiaryCard key={diary.id} diary={diary} />
                        ))
                    )}
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
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    headerSubtitle: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: Spacing.xs,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    navButton: {
        padding: Spacing.sm,
    },
    monthTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
    },
    calendarCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        ...Shadows.md,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    weekdayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    weekdayText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[500],
    },
    sundayText: {
        color: Palette.status.error,
    },
    saturdayText: {
        color: Palette.primary[500],
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    selectedDay: {
        backgroundColor: Palette.primary[500],
        borderRadius: BorderRadius.md,
    },
    todayDay: {
        backgroundColor: Palette.primary[100],
        borderRadius: BorderRadius.md,
    },
    dayNumber: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: FontWeight.bold,
    },
    dayEmoji: {
        fontSize: 10,
        marginTop: -2,
    },
    diariesSection: {
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
        marginBottom: Spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
        marginBottom: Spacing.lg,
    },
    createButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    loginButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});
