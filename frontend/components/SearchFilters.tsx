import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SearchFiltersProps {
    onPeriodChange: (startDate: string | null, endDate: string | null) => void;
    onTagChange?: (tagIds: number[]) => void;
    tags?: { id: number; name: string; color: string }[];
    selectedTags?: number[];
}

type PeriodOption = 'all' | 'today' | 'week' | 'month' | 'custom';

export function SearchFilters({
    onPeriodChange,
    onTagChange,
    tags = [],
    selectedTags = [],
}: SearchFiltersProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('all');
    const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

    const periodOptions: { key: PeriodOption; label: string }[] = [
        { key: 'all', label: '전체' },
        { key: 'today', label: '오늘' },
        { key: 'week', label: '이번 주' },
        { key: 'month', label: '이번 달' },
        { key: 'custom', label: '직접 선택' },
    ];

    const handlePeriodSelect = (period: PeriodOption) => {
        setSelectedPeriod(period);

        const now = new Date();
        let startDate: string | null = null;
        let endDate: string | null = null;

        switch (period) {
            case 'today':
                startDate = now.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                startDate = weekStart.toISOString().split('T')[0];
                endDate = now.toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                endDate = now.toISOString().split('T')[0];
                break;
            case 'custom':
                setShowDatePicker('start');
                return;
            case 'all':
            default:
                break;
        }

        onPeriodChange(startDate, endDate);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (selectedDate) {
            if (showDatePicker === 'start') {
                setCustomStartDate(selectedDate);
                setShowDatePicker('end');
            } else if (showDatePicker === 'end') {
                setCustomEndDate(selectedDate);
                setShowDatePicker(null);
                // 날짜 범위 적용
                const startStr = customStartDate?.toISOString().split('T')[0] || selectedDate.toISOString().split('T')[0];
                const endStr = selectedDate.toISOString().split('T')[0];
                onPeriodChange(startStr, endStr);
            }
        } else {
            setShowDatePicker(null);
        }
    };

    const handleTagToggle = (tagId: number) => {
        if (!onTagChange) return;

        const newTags = selectedTags.includes(tagId)
            ? selectedTags.filter(id => id !== tagId)
            : [...selectedTags, tagId];

        onTagChange(newTags);
    };

    const formatDateRange = () => {
        if (customStartDate && customEndDate) {
            const startStr = customStartDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            const endStr = customEndDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            return `${startStr} ~ ${endStr}`;
        }
        return '직접 선택';
    };

    return (
        <View style={styles.container}>
            {/* 기간 필터 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 기간</Text>
                <View style={styles.periodOptions}>
                    {periodOptions.map(option => (
                        <TouchableOpacity
                            key={option.key}
                            style={[
                                styles.periodButton,
                                selectedPeriod === option.key && styles.periodButtonActive,
                            ]}
                            onPress={() => handlePeriodSelect(option.key)}
                        >
                            <Text style={[
                                styles.periodButtonText,
                                selectedPeriod === option.key && styles.periodButtonTextActive,
                            ]}>
                                {option.key === 'custom' && selectedPeriod === 'custom' && customEndDate
                                    ? formatDateRange()
                                    : option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 태그 필터 */}
            {tags.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏷️ 태그</Text>
                    <View style={styles.tagsContainer}>
                        {tags.map(tag => (
                            <TouchableOpacity
                                key={tag.id}
                                style={[
                                    styles.tagButton,
                                    { borderColor: tag.color },
                                    selectedTags.includes(tag.id) && {
                                        backgroundColor: tag.color + '20',
                                    },
                                ]}
                                onPress={() => handleTagToggle(tag.id)}
                            >
                                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                                <Text style={[
                                    styles.tagButtonText,
                                    selectedTags.includes(tag.id) && { color: tag.color, fontWeight: '600' },
                                ]}>
                                    {tag.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* 날짜 선택기 모달 */}
            {showDatePicker && (
                <Modal transparent animationType="slide">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <Text style={styles.datePickerTitle}>
                                {showDatePicker === 'start' ? '시작일 선택' : '종료일 선택'}
                            </Text>
                            <DateTimePicker
                                value={showDatePicker === 'start' ? (customStartDate || new Date()) : (customEndDate || new Date())}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                                minimumDate={showDatePicker === 'end' && customStartDate ? customStartDate : undefined}
                            />
                            <TouchableOpacity
                                style={styles.datePickerCancel}
                                onPress={() => setShowDatePicker(null)}
                            >
                                <Text style={styles.datePickerCancelText}>취소</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: Spacing.md,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    section: {
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        marginBottom: Spacing.sm,
        fontWeight: FontWeight.medium,
    },
    periodOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    periodButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.neutral[100],
    },
    periodButtonActive: {
        backgroundColor: Palette.primary[500],
    },
    periodButtonText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    periodButtonTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    tagButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        backgroundColor: '#fff',
    },
    tagDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Spacing.xs,
    },
    tagButtonText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    datePickerContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
    },
    datePickerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    datePickerCancel: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        alignItems: 'center',
    },
    datePickerCancelText: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
    },
});

export default SearchFilters;
