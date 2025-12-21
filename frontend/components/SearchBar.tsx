import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface SearchBarProps {
    onSearch: (query: string) => void;
    onFilterChange: (filters: SearchFilters) => void;
}

export interface SearchFilters {
    search: string;
    emotion: string;
    startDate: string;
    endDate: string;
}

const EMOTIONS = [
    { value: '', label: '전체' },
    { value: 'happy', label: '😊 행복' },
    { value: 'sad', label: '😢 슬픔' },
    { value: 'angry', label: '😡 화남' },
    { value: 'anxious', label: '😰 불안' },
    { value: 'peaceful', label: '😌 평온' },
    { value: 'excited', label: '🥳 신남' },
    { value: 'tired', label: '😴 피곤' },
    { value: 'love', label: '🥰 사랑' },
];

export default function SearchBar({ onSearch, onFilterChange }: SearchBarProps) {
    const [searchText, setSearchText] = useState('');
    const [selectedEmotion, setSelectedEmotion] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const handleSearch = () => {
        onSearch(searchText);
        onFilterChange({
            search: searchText,
            emotion: selectedEmotion,
            startDate: '',
            endDate: '',
        });
    };

    const handleEmotionSelect = (emotion: string) => {
        setSelectedEmotion(emotion);
        onFilterChange({
            search: searchText,
            emotion: emotion,
            startDate: '',
            endDate: '',
        });
    };

    const clearFilters = () => {
        setSearchText('');
        setSelectedEmotion('');
        onFilterChange({
            search: '',
            emotion: '',
            startDate: '',
            endDate: '',
        });
    };

    return (
        <View style={styles.container}>
            {/* 검색 입력 */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="일기 검색..."
                    placeholderTextColor={Palette.neutral[400]}
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                >
                    <Text style={styles.searchButtonText}>🔍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Text style={styles.filterToggleText}>⚙️</Text>
                </TouchableOpacity>
            </View>

            {/* 감정 필터 */}
            {showFilters && (
                <View style={styles.filtersContainer}>
                    <View style={styles.filterHeader}>
                        <Text style={styles.filterLabel}>감정으로 필터</Text>
                        {(searchText || selectedEmotion) && (
                            <TouchableOpacity onPress={clearFilters}>
                                <Text style={styles.clearButton}>초기화</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.emotionList}
                    >
                        {EMOTIONS.map((emotion) => (
                            <TouchableOpacity
                                key={emotion.value}
                                style={[
                                    styles.emotionChip,
                                    selectedEmotion === emotion.value && styles.emotionChipActive
                                ]}
                                onPress={() => handleEmotionSelect(emotion.value)}
                            >
                                <Text style={[
                                    styles.emotionChipText,
                                    selectedEmotion === emotion.value && styles.emotionChipTextActive
                                ]}>
                                    {emotion.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* 활성 필터 표시 */}
            {(searchText || selectedEmotion) && !showFilters && (
                <View style={styles.activeFilters}>
                    {searchText && (
                        <View style={styles.activeFilterChip}>
                            <Text style={styles.activeFilterText}>"{searchText}"</Text>
                        </View>
                    )}
                    {selectedEmotion && (
                        <View style={styles.activeFilterChip}>
                            <Text style={styles.activeFilterText}>
                                {EMOTIONS.find(e => e.value === selectedEmotion)?.label}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={clearFilters}>
                        <Text style={styles.clearButton}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[200],
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Palette.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    searchButtonText: {
        fontSize: FontSize.lg,
    },
    filterToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Palette.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterToggleActive: {
        backgroundColor: Palette.secondary[100],
    },
    filterToggleText: {
        fontSize: FontSize.lg,
    },
    filtersContainer: {
        marginTop: Spacing.md,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    filterLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[600],
    },
    clearButton: {
        fontSize: FontSize.sm,
        color: Palette.primary[500],
        fontWeight: FontWeight.semibold,
    },
    emotionList: {
        gap: Spacing.sm,
    },
    emotionChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.neutral[100],
        marginRight: Spacing.sm,
    },
    emotionChipActive: {
        backgroundColor: Palette.primary[500],
    },
    emotionChipText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
    },
    emotionChipTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    activeFilters: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
        gap: Spacing.sm,
    },
    activeFilterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.primary[100],
    },
    activeFilterText: {
        fontSize: FontSize.xs,
        color: Palette.primary[600],
    },
});
