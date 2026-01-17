import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { diaryService, Diary } from '@/services/api';
import { CalendarDiaryCard } from '@/components/diary/CalendarDiaryCard';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';


// 한국어 설정
LocaleConfig.locales['ko'] = {
    monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

type CalendarData = Record<string, { count: number; emotion: string | null; emoji: string; diary_ids: number[] }>;

type ViewMode = 'monthly' | 'weekly';

export default function CalendarScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { colors, isDark } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData>({});
    const [selectedDiaries, setSelectedDiaries] = useState<Diary[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('monthly');


    // 현재 년/월 (API 호출용)
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const fetchCalendarData = useCallback(async (year: number, month: number) => {
        if (!isAuthenticated) return;
        try {
            setLoading(true);
            const data = await diaryService.getCalendar(year, month);
            setCalendarData(data.days);
        } catch (err) {
            console.error('Failed to fetch calendar:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchCalendarData(currentYear, currentMonth);
    }, [fetchCalendarData, currentYear, currentMonth]);

    // 달력 월 변경 핸들러
    const onMonthChange = (date: DateData) => {
        const newDate = new Date(date.dateString);
        setCurrentDate(newDate);
    };

    const handleDateSelect = async (day: DateData) => {
        const dateStr = day.dateString;

        // 미래 날짜 방지
        const selected = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selected > today) {
            Alert.alert('안내', '미래 날짜는 선택할 수 없습니다.');
            return;
        }

        setSelectedDate(dateStr);
        try {
            const diaries = await diaryService.getByDate(dateStr);
            setSelectedDiaries(diaries);
        } catch (err) {
            console.error('Failed to fetch diaries for date:', err);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await diaryService.delete(id);
            setSelectedDiaries(prev => prev.filter(d => d.id !== id));
            fetchCalendarData(currentYear, currentMonth); // Refresh calendar
        } catch (err) {
            Alert.alert('오류', '삭제에 실패했습니다');
        }
    };

    // Custom Day Component for Emoji rendering
    const DayComponent = ({ date, state }: { date?: DateData; state?: string }) => {
        if (!date) return <View />;
        const dateStr = date.dateString;
        const dayData = calendarData[dateStr];
        const isSelected = selectedDate === dateStr;
        const isToday = state === 'today';

        return (
            <TouchableOpacity
                style={[
                    styles.dayContainer,
                    isSelected && styles.selectedDay,
                    isToday && !isSelected && styles.todayDay
                ]}
                onPress={() => handleDateSelect(date)}
            >
                <Text style={[
                    styles.dayText,
                    { color: state === 'disabled' ? '#d9e1e8' : (isSelected ? '#fff' : colors.text) },
                    isToday && !isSelected && { color: Palette.primary[500], fontWeight: 'bold' }
                ]}>
                    {date.day}
                </Text>
                {dayData?.emoji ? (
                    <Text style={styles.dayEmoji}>{dayData.emoji}</Text>
                ) : (
                    <View style={styles.emptyEmojiPlaceholder} />
                )}
            </TouchableOpacity>
        );
    };

    if (!isAuthenticated) {
        return (
            <LinearGradient colors={['#FFE5E5', '#FFF5F3', '#F5E6FF']} style={styles.fullContainer}>
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

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>📅 캘린더</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>감정 흐름을 한눈에 확인하세요</Text>
            </View>

            {/* 월간/주간 토글 버튼 */}
            <View style={styles.viewModeToggle}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'monthly' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setViewMode('monthly')}
                >
                    <IconSymbol name="calendar" size={16} color={viewMode === 'monthly' ? '#fff' : Palette.neutral[600]} />
                    <Text style={[styles.toggleButtonText, viewMode === 'monthly' && styles.toggleButtonTextActive]}>월간</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'weekly' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setViewMode('weekly')}
                >
                    <IconSymbol name="list.bullet" size={16} color={viewMode === 'weekly' ? '#fff' : Palette.neutral[600]} />
                    <Text style={[styles.toggleButtonText, viewMode === 'weekly' && styles.toggleButtonTextActive]}>주간</Text>
                </TouchableOpacity>
            </View>

            {/* 주간 캘린더 */}
            {viewMode === 'weekly' && (
                <WeeklyCalendar
                    data={calendarData}
                    selectedDate={selectedDate || undefined}
                    onDateSelect={async (dateStr) => {
                        setSelectedDate(dateStr);
                        try {
                            const diaries = await diaryService.getByDate(dateStr);
                            setSelectedDiaries(diaries);
                        } catch (err) {
                            console.error('Failed to fetch diaries:', err);
                        }
                    }}
                    currentDate={currentDate}
                />
            )}

            {/* 월간 캘린더 */}
            {viewMode === 'monthly' && (

                <View style={[styles.calendarWrapper, { backgroundColor: colors.card }]}>
                    <Calendar
                        current={currentDate.toISOString().split('T')[0]}
                        onMonthChange={onMonthChange}
                        dayComponent={DayComponent}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: '#b6c1cd',
                            selectedDayBackgroundColor: Palette.primary[500],
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: Palette.primary[500],
                            dayTextColor: '#2d4150',
                            textDisabledColor: '#d9e1e8',
                            arrowColor: Palette.primary[500],
                            monthTextColor: colors.text,
                            textDayFontWeight: '600',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 18,
                            textDayHeaderFontSize: 13
                        }}
                        enableSwipeMonths={true}
                    />
                </View>
            )}

            {loading && (
                <ActivityIndicator style={{ marginTop: 20 }} color={Palette.primary[500]} />
            )}

            {selectedDate && (
                <View style={styles.diariesSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {selectedDate} ({selectedDiaries.length})
                    </Text>

                    {selectedDiaries.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                            <Text style={styles.emptyEmoji}>✍️</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>작성된 일기가 없습니다</Text>
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={() => router.push('/diary/create' as any)}
                            >
                                <Text style={styles.createButtonText}>일기 쓰러 가기</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        selectedDiaries.map((diary) => (
                            <CalendarDiaryCard
                                key={diary.id}
                                diary={diary}
                                isToday={selectedDate === new Date().toISOString().split('T')[0]}
                                onDelete={handleDelete}
                            />
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
    },
    fullContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        flexShrink: 1,
    },
    headerSubtitle: {
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
        flexShrink: 1,
    },
    calendarWrapper: {
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.xl,
        padding: Spacing.sm,
        ...Shadows.md,
    },
    dayContainer: {
        width: 32,
        height: 48,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 4,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectedDay: {
        backgroundColor: Palette.primary[500],
        borderRadius: 12,
    },
    todayDay: {
        backgroundColor: Palette.primary[100],
        borderRadius: 12,
    },
    dayEmoji: {
        fontSize: 12,
        marginTop: 2,
    },
    emptyEmojiPlaceholder: {
        height: 14, // Keep consistent height
    },
    diariesSection: {
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        marginBottom: Spacing.md,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.semibold,
        marginBottom: Spacing.lg,
        color: Palette.neutral[700],
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
    },
    emptyEmoji: {
        fontSize: 40,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        marginBottom: Spacing.lg,
    },
    createButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    viewModeToggle: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.neutral[100],
    },
    toggleButtonActive: {
        backgroundColor: Palette.primary[500],
    },
    toggleButtonText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    toggleButtonTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});
