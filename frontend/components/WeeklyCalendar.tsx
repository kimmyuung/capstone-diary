import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface DayData {
    date: string;
    count: number;
    emotion?: string | null;
    emoji?: string;
}

interface WeeklyCalendarProps {
    data: Record<string, DayData>;
    selectedDate?: string;
    onDateSelect: (date: string) => void;
    currentDate?: Date;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
    data,
    selectedDate,
    onDateSelect,
    currentDate = new Date(),
}) => {
    const { isDark } = useTheme();
    const [weekOffset, setWeekOffset] = useState(0);

    // 현재 주의 날짜 계산
    const weekDays = useMemo(() => {
        const today = new Date(currentDate);
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek + (weekOffset * 7));

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            days.push({
                date: dateString,
                dayOfWeek: WEEKDAYS[i],
                dayOfMonth: date.getDate(),
                isToday: dateString === new Date().toISOString().split('T')[0],
                data: data[dateString] || null,
            });
        }
        return days;
    }, [currentDate, weekOffset, data]);

    const weekTitle = useMemo(() => {
        if (weekDays.length === 0) return '';
        const start = new Date(weekDays[0].date);
        const end = new Date(weekDays[6].date);
        return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
    }, [weekDays]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {/* 주간 네비게이션 */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => setWeekOffset(weekOffset - 1)}
                >
                    <Text style={[styles.navText, isDark && styles.textLight]}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setWeekOffset(0)}
                >
                    <Text style={[styles.weekTitle, isDark && styles.textLight]}>
                        {weekTitle}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => setWeekOffset(weekOffset + 1)}
                >
                    <Text style={[styles.navText, isDark && styles.textLight]}>▶</Text>
                </TouchableOpacity>
            </View>

            {/* 요일 헤더 */}
            <View style={styles.weekdayHeader}>
                {WEEKDAYS.map((day, index) => (
                    <Text
                        key={day}
                        style={[
                            styles.weekdayText,
                            isDark && styles.textLight,
                            index === 0 && styles.sundayText,
                            index === 6 && styles.saturdayText,
                        ]}
                    >
                        {day}
                    </Text>
                ))}
            </View>

            {/* 날짜 행 */}
            <View style={styles.daysRow}>
                {weekDays.map((day) => {
                    const isSelected = selectedDate === day.date;
                    const hasEntry = day.data && day.data.count > 0;

                    return (
                        <TouchableOpacity
                            key={day.date}
                            style={[
                                styles.dayCell,
                                day.isToday && styles.todayCell,
                                isSelected && styles.selectedCell,
                            ]}
                            onPress={() => onDateSelect(day.date)}
                        >
                            <Text
                                style={[
                                    styles.dayNumber,
                                    isDark && styles.textLight,
                                    day.isToday && styles.todayText,
                                    isSelected && styles.selectedText,
                                ]}
                            >
                                {day.dayOfMonth}
                            </Text>
                            {hasEntry && (
                                <Text style={styles.emoji}>
                                    {day.data?.emoji || '📝'}
                                </Text>
                            )}
                            {hasEntry && (
                                <View style={[
                                    styles.countBadge,
                                    isSelected && styles.countBadgeSelected,
                                ]}>
                                    <Text style={styles.countText}>{day.data?.count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    containerDark: {
        backgroundColor: '#1E1E24',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    navButton: {
        padding: Spacing.sm,
    },
    navText: {
        fontSize: FontSize.md,
        color: Palette.primary[500],
    },
    weekTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
    },
    textLight: {
        color: Palette.neutral[200],
    },
    weekdayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.sm,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        fontWeight: FontWeight.medium,
    },
    sundayText: {
        color: '#EF4444',
    },
    saturdayText: {
        color: '#3B82F6',
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        minHeight: 70,
    },
    todayCell: {
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
    },
    selectedCell: {
        backgroundColor: Palette.primary[500],
    },
    dayNumber: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
        fontWeight: FontWeight.medium,
    },
    todayText: {
        color: Palette.primary[500],
        fontWeight: FontWeight.bold,
    },
    selectedText: {
        color: '#fff',
    },
    emoji: {
        fontSize: 18,
        marginTop: 2,
    },
    countBadge: {
        backgroundColor: Palette.primary[100],
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        marginTop: 2,
    },
    countBadgeSelected: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    countText: {
        fontSize: FontSize.xs,
        color: Palette.primary[700],
        fontWeight: FontWeight.medium,
    },
});

export default WeeklyCalendar;
