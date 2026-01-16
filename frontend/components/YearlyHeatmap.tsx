import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - Spacing.lg * 2 - 32) / 53); // 52주 + 여백
const CELL_GAP = 2;

interface HeatmapData {
    [date: string]: {
        count: number;
        emotion: string | null;
        color: string;
    } | null;
}

interface YearlyHeatmapProps {
    year: number;
    data: HeatmapData;
    totalEntries: number;
    streak: {
        current: number;
        longest: number;
    };
    onDatePress?: (date: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export const YearlyHeatmap: React.FC<YearlyHeatmapProps> = ({
    year,
    data,
    totalEntries,
    streak,
    onDatePress,
}) => {
    const { isDark } = useTheme();

    // 연도의 모든 주 생성 (52-53주)
    const weeks = useMemo(() => {
        const result: string[][] = [];
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        // 첫 번째 주의 시작을 일요일로 맞춤
        const firstSunday = new Date(startDate);
        firstSunday.setDate(startDate.getDate() - startDate.getDay());

        let currentDate = new Date(firstSunday);
        let currentWeek: string[] = [];

        while (currentDate <= endDate || currentWeek.length > 0) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const isCurrentYear = currentDate.getFullYear() === year;

            // 해당 연도의 날짜만 포함
            currentWeek.push(isCurrentYear ? dateStr : '');

            if (currentWeek.length === 7) {
                result.push(currentWeek);
                currentWeek = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);

            // 다음 해로 넘어가면 남은 주 완성하고 종료
            if (currentDate.getFullYear() > year && currentWeek.length === 0) {
                break;
            }
        }

        // 마지막 미완성 주 추가
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push('');
            }
            result.push(currentWeek);
        }

        return result;
    }, [year]);

    // 월 라벨 위치 계산
    const monthLabels = useMemo(() => {
        const labels: { month: number; weekIndex: number }[] = [];
        let lastMonth = -1;

        weeks.forEach((week, weekIndex) => {
            const firstValidDate = week.find(d => d !== '');
            if (firstValidDate) {
                const month = new Date(firstValidDate).getMonth();
                if (month !== lastMonth) {
                    labels.push({ month, weekIndex });
                    lastMonth = month;
                }
            }
        });

        return labels;
    }, [weeks]);

    const getCellColor = (dateStr: string): string => {
        if (!dateStr) return 'transparent';
        const entry = data[dateStr];
        if (!entry) return isDark ? '#2d2d2d' : '#ebedf0';
        return entry.color;
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {/* 헤더 - 통계 */}
            <View style={styles.header}>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, isDark && styles.textLight]}>
                        {totalEntries}
                    </Text>
                    <Text style={[styles.statLabel, isDark && styles.textMuted]}>
                        총 일기
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, isDark && styles.textLight]}>
                        {streak.current}
                    </Text>
                    <Text style={[styles.statLabel, isDark && styles.textMuted]}>
                        연속 기록 중
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, isDark && styles.textLight]}>
                        {streak.longest}
                    </Text>
                    <Text style={[styles.statLabel, isDark && styles.textMuted]}>
                        최장 연속
                    </Text>
                </View>
            </View>

            {/* 히트맵 그리드 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    {/* 월 라벨 */}
                    <View style={styles.monthRow}>
                        {monthLabels.map(({ month, weekIndex }) => (
                            <Text
                                key={`month-${month}`}
                                style={[
                                    styles.monthLabel,
                                    isDark && styles.textMuted,
                                    { left: weekIndex * (CELL_SIZE + CELL_GAP) },
                                ]}
                            >
                                {MONTHS[month]}
                            </Text>
                        ))}
                    </View>

                    {/* 요일 라벨 + 그리드 */}
                    <View style={styles.gridContainer}>
                        {/* 요일 라벨 */}
                        <View style={styles.weekdayColumn}>
                            {WEEKDAYS.map((day, i) => (
                                <Text
                                    key={day}
                                    style={[
                                        styles.weekdayLabel,
                                        isDark && styles.textMuted,
                                        { height: CELL_SIZE + CELL_GAP },
                                        i % 2 === 0 && styles.weekdayHidden,
                                    ]}
                                >
                                    {i % 2 === 1 ? day : ''}
                                </Text>
                            ))}
                        </View>

                        {/* 히트맵 그리드 */}
                        <View style={styles.grid}>
                            {weeks.map((week, weekIndex) => (
                                <View key={weekIndex} style={styles.weekColumn}>
                                    {week.map((dateStr, dayIndex) => (
                                        <TouchableOpacity
                                            key={`${weekIndex}-${dayIndex}`}
                                            style={[
                                                styles.cell,
                                                {
                                                    width: CELL_SIZE,
                                                    height: CELL_SIZE,
                                                    backgroundColor: getCellColor(dateStr),
                                                },
                                            ]}
                                            onPress={() => dateStr && onDatePress?.(dateStr)}
                                            disabled={!dateStr || !data[dateStr]}
                                        />
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* 범례 */}
            <View style={styles.legend}>
                <Text style={[styles.legendLabel, isDark && styles.textMuted]}>적음</Text>
                <View style={[styles.legendCell, { backgroundColor: isDark ? '#2d2d2d' : '#ebedf0' }]} />
                <View style={[styles.legendCell, { backgroundColor: '#9be9a8' }]} />
                <View style={[styles.legendCell, { backgroundColor: '#40c463' }]} />
                <View style={[styles.legendCell, { backgroundColor: '#30a14e' }]} />
                <View style={[styles.legendCell, { backgroundColor: '#216e39' }]} />
                <Text style={[styles.legendLabel, isDark && styles.textMuted]}>많음</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    containerDark: {
        backgroundColor: '#1e1e1e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: FontSize.xxl,
        fontWeight: 'bold',
        color: Palette.primary[500],
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        marginTop: 2,
    },
    textLight: {
        color: '#fff',
    },
    textMuted: {
        color: '#888',
    },
    monthRow: {
        height: 20,
        position: 'relative',
        marginLeft: 30, // 요일 라벨 너비
    },
    monthLabel: {
        position: 'absolute',
        fontSize: 10,
        color: Palette.neutral[500],
    },
    gridContainer: {
        flexDirection: 'row',
    },
    weekdayColumn: {
        width: 24,
        marginRight: 4,
    },
    weekdayLabel: {
        fontSize: 10,
        color: Palette.neutral[500],
        textAlign: 'right',
        paddingRight: 4,
        lineHeight: CELL_SIZE + CELL_GAP,
    },
    weekdayHidden: {
        opacity: 0,
    },
    grid: {
        flexDirection: 'row',
    },
    weekColumn: {
        marginRight: CELL_GAP,
    },
    cell: {
        marginBottom: CELL_GAP,
        borderRadius: 2,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: Spacing.md,
        gap: 4,
    },
    legendCell: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    legendLabel: {
        fontSize: 10,
        color: Palette.neutral[500],
        marginHorizontal: 4,
    },
});

export default YearlyHeatmap;
