// components/EmotionHeatmap.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { diaryService, HeatmapData } from '@/services/api';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface EmotionHeatmapProps {
    year?: number;
    isDark?: boolean;
    onDayPress?: (date: string, data: { count: number; emotion: string | null; color: string } | null) => void;
}

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS_IN_YEAR = 53;
const DAYS_IN_WEEK = 7;

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function EmotionHeatmap({ year, isDark = false, onDayPress }: EmotionHeatmapProps) {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());

    useEffect(() => {
        loadData();
    }, [selectedYear]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await diaryService.getHeatmap(selectedYear);
            setData(result);
        } catch (err) {
            console.error('Heatmap load error:', err);
            setError('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const getWeeksArray = () => {
        if (!data) return [];

        const weeks: { date: string; data: { count: number; emotion: string | null; color: string } | null }[][] = [];
        const startDate = new Date(selectedYear, 0, 1);
        const startDayOfWeek = startDate.getDay();

        // 첫 주의 빈 셀 추가
        let currentWeek: { date: string; data: { count: number; emotion: string | null; color: string } | null }[] = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            currentWeek.push({ date: '', data: null });
        }

        // 1년 전체 순회
        const currentDate = new Date(startDate);
        while (currentDate.getFullYear() === selectedYear) {
            const dateStr = currentDate.toISOString().split('T')[0];
            currentWeek.push({
                date: dateStr,
                data: data.data[dateStr] || null,
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 마지막 주 처리
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: '', data: null });
            }
            weeks.push(currentWeek);
        }

        return weeks;
    };

    const renderCell = (
        item: { date: string; data: { count: number; emotion: string | null; color: string } | null },
        dayIndex: number,
        weekIndex: number
    ) => {
        if (!item.date) {
            return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.emptyCell} />;
        }

        const cellColor = item.data?.color || (isDark ? '#2D2D2D' : '#E8E8E8');
        const isToday = item.date === new Date().toISOString().split('T')[0];

        return (
            <TouchableOpacity
                key={item.date}
                style={[
                    styles.cell,
                    { backgroundColor: cellColor },
                    isToday && styles.todayCell,
                ]}
                onPress={() => onDayPress?.(item.date, item.data)}
                activeOpacity={0.7}
            />
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Palette.primary[500]} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={[styles.errorText, isDark && styles.textDark]}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                    <Text style={styles.retryText}>다시 시도</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const weeks = getWeeksArray();

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}>
                    <Text style={[styles.navButton, isDark && styles.textDark]}>◀</Text>
                </TouchableOpacity>
                <Text style={[styles.yearTitle, isDark && styles.textDark]}>{selectedYear}년</Text>
                <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}>
                    <Text style={[styles.navButton, isDark && styles.textDark]}>▶</Text>
                </TouchableOpacity>
            </View>

            {/* 통계 */}
            {data && (
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, isDark && styles.textDark]}>{data.total_entries}</Text>
                        <Text style={[styles.statLabel, isDark && styles.textMuted]}>총 일기</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: Palette.status.success }]}>🔥 {data.streak.current}</Text>
                        <Text style={[styles.statLabel, isDark && styles.textMuted]}>연속</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, isDark && styles.textDark]}>{data.streak.longest}</Text>
                        <Text style={[styles.statLabel, isDark && styles.textMuted]}>최장</Text>
                    </View>
                </View>
            )}

            {/* 히트맵 그리드 */}
            <View style={styles.heatmapContainer}>
                {/* 요일 라벨 */}
                <View style={styles.dayLabels}>
                    {DAY_LABELS.map((day, i) => (
                        <Text
                            key={day}
                            style={[
                                styles.dayLabel,
                                isDark && styles.textMuted,
                                i % 2 === 1 && { opacity: 0 }, // 홀수 요일만 표시
                            ]}
                        >
                            {day}
                        </Text>
                    ))}
                </View>

                {/* 히트맵 그리드 */}
                <View style={styles.grid}>
                    {weeks.map((week, weekIndex) => (
                        <View key={weekIndex} style={styles.week}>
                            {week.map((item, dayIndex) => renderCell(item, dayIndex, weekIndex))}
                        </View>
                    ))}
                </View>
            </View>

            {/* 범례 */}
            {data && (
                <View style={styles.legend}>
                    <Text style={[styles.legendLabel, isDark && styles.textMuted]}>적음</Text>
                    <View style={styles.legendColors}>
                        <View style={[styles.legendCell, { backgroundColor: isDark ? '#2D2D2D' : '#E8E8E8' }]} />
                        <View style={[styles.legendCell, { backgroundColor: '#4ECDC4' }]} />
                        <View style={[styles.legendCell, { backgroundColor: '#FFD93D' }]} />
                        <View style={[styles.legendCell, { backgroundColor: '#FF9F43' }]} />
                        <View style={[styles.legendCell, { backgroundColor: '#FF6B6B' }]} />
                    </View>
                    <Text style={[styles.legendLabel, isDark && styles.textMuted]}>많음</Text>
                </View>
            )}

            {/* 감정 색상 범례 */}
            {data && (
                <View style={styles.emotionLegend}>
                    {Object.entries(data.emotion_colors).slice(0, -1).map(([emotion, color]) => (
                        <View key={emotion} style={styles.emotionItem}>
                            <View style={[styles.emotionDot, { backgroundColor: color }]} />
                            <Text style={[styles.emotionLabel, isDark && styles.textMuted]}>
                                {emotion === 'happy' ? '행복' :
                                    emotion === 'sad' ? '슬픔' :
                                        emotion === 'angry' ? '화남' :
                                            emotion === 'anxious' ? '불안' :
                                                emotion === 'peaceful' ? '평온' :
                                                    emotion === 'excited' ? '신남' :
                                                        emotion === 'tired' ? '피곤' :
                                                            emotion === 'love' ? '사랑' : emotion}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    containerDark: {
        backgroundColor: '#1E1E1E',
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        marginBottom: Spacing.md,
    },
    textDark: {
        color: '#fff',
    },
    textMuted: {
        color: Palette.neutral[400],
    },
    retryButton: {
        backgroundColor: Palette.primary[500],
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    retryText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        gap: Spacing.lg,
    },
    yearTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    navButton: {
        fontSize: FontSize.lg,
        color: Palette.primary[500],
        paddingHorizontal: Spacing.md,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.lg,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Palette.neutral[100],
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        marginTop: 2,
    },
    heatmapContainer: {
        flexDirection: 'row',
    },
    dayLabels: {
        marginRight: Spacing.xs,
        justifyContent: 'space-around',
    },
    dayLabel: {
        fontSize: 10,
        color: Palette.neutral[500],
        height: CELL_SIZE + CELL_GAP,
        lineHeight: CELL_SIZE + CELL_GAP,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        overflow: 'scroll',
    },
    week: {
        flexDirection: 'column',
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        margin: CELL_GAP / 2,
        borderRadius: 2,
    },
    emptyCell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        margin: CELL_GAP / 2,
    },
    todayCell: {
        borderWidth: 2,
        borderColor: Palette.primary[500],
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        gap: Spacing.xs,
    },
    legendColors: {
        flexDirection: 'row',
        gap: 2,
    },
    legendCell: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    legendLabel: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
    },
    emotionLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: Spacing.md,
        gap: Spacing.sm,
    },
    emotionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    emotionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    emotionLabel: {
        fontSize: FontSize.xs,
        color: Palette.neutral[600],
    },
});
