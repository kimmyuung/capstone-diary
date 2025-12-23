/**
 * 위치 선택 컴포넌트
 * 
 * GPS 위치 수집과 카테고리 선택을 통합한 위치 선택 UI를 제공합니다.
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useLocation, LocationData } from '@/hooks/useLocation';

// 위치 카테고리 목록
const LOCATION_CATEGORIES = [
    { id: 'home', emoji: '🏠', label: '집' },
    { id: 'work', emoji: '🏢', label: '회사/학교' },
    { id: 'cafe', emoji: '☕', label: '카페' },
    { id: 'restaurant', emoji: '🍽️', label: '식당' },
    { id: 'park', emoji: '🌳', label: '공원' },
    { id: 'gym', emoji: '🏋️', label: '헬스장' },
    { id: 'travel', emoji: '✈️', label: '여행' },
    { id: 'other', emoji: '📍', label: '기타' },
];

export interface LocationPickerValue {
    locationName: string | null;
    latitude: number | null;
    longitude: number | null;
}

interface LocationPickerProps {
    /** 초기값 */
    initialValue?: LocationPickerValue;
    /** 값 변경 콜백 */
    onChange: (value: LocationPickerValue) => void;
    /** 비활성화 여부 */
    disabled?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    initialValue,
    onChange,
    disabled = false,
}) => {
    const { location, isLoading, error, requestLocation, clearLocation } = useLocation();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [customLocationName, setCustomLocationName] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // 초기값 설정
    useEffect(() => {
        if (initialValue?.locationName) {
            // 카테고리와 매칭되는지 확인
            const matchedCategory = LOCATION_CATEGORIES.find(
                c => c.label === initialValue.locationName
            );
            if (matchedCategory) {
                setSelectedCategory(matchedCategory.id);
            } else if (initialValue.locationName) {
                setShowCustomInput(true);
                setCustomLocationName(initialValue.locationName);
            }
        }
    }, []);

    // GPS 위치 수집 결과 처리
    useEffect(() => {
        if (location) {
            onChange({
                locationName: location.locationName || customLocationName || null,
                latitude: location.latitude,
                longitude: location.longitude,
            });
        }
    }, [location]);

    /**
     * GPS 위치 수집
     */
    const handleGetCurrentLocation = async () => {
        const result = await requestLocation();
        if (result) {
            // 카테고리 선택 해제
            setSelectedCategory(null);
            setShowCustomInput(false);
        }
    };

    /**
     * 카테고리 선택
     */
    const handleCategorySelect = (categoryId: string) => {
        if (selectedCategory === categoryId) {
            // 선택 해제
            setSelectedCategory(null);
            setShowCustomInput(false);
            setCustomLocationName('');
            clearLocation();
            onChange({ locationName: null, latitude: null, longitude: null });
        } else {
            setSelectedCategory(categoryId);
            clearLocation();

            if (categoryId === 'other') {
                setShowCustomInput(true);
                onChange({ locationName: null, latitude: null, longitude: null });
            } else {
                setShowCustomInput(false);
                setCustomLocationName('');
                const category = LOCATION_CATEGORIES.find(c => c.id === categoryId);
                onChange({
                    locationName: category?.label || null,
                    latitude: null,
                    longitude: null,
                });
            }
        }
    };

    /**
     * 직접 입력 변경
     */
    const handleCustomInputChange = (text: string) => {
        setCustomLocationName(text);
        onChange({
            locationName: text.trim() || null,
            latitude: null,
            longitude: null,
        });
    };

    /**
     * 위치 초기화
     */
    const handleClear = () => {
        setSelectedCategory(null);
        setShowCustomInput(false);
        setCustomLocationName('');
        clearLocation();
        onChange({ locationName: null, latitude: null, longitude: null });
    };

    // 현재 위치 표시 문자열
    const currentLocationDisplay = location?.locationName
        ? `📍 ${location.locationName}`
        : location?.latitude
            ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : null;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>📍 장소</Text>

            {/* 현재 위치 사용 버튼 */}
            <TouchableOpacity
                style={[styles.gpsButton, isLoading && styles.gpsButtonLoading]}
                onPress={handleGetCurrentLocation}
                disabled={disabled || isLoading}
                activeOpacity={0.7}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={Palette.primary[500]} />
                ) : (
                    <IconSymbol name="location.fill" size={18} color={Palette.primary[500]} />
                )}
                <Text style={styles.gpsButtonText}>
                    {isLoading ? '위치 확인 중...' : '현재 위치 사용'}
                </Text>
            </TouchableOpacity>

            {/* 에러 표시 */}
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}

            {/* GPS 위치 결과 표시 */}
            {currentLocationDisplay && (
                <View style={styles.locationResult}>
                    <Text style={styles.locationResultText}>{currentLocationDisplay}</Text>
                    <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <IconSymbol name="xmark.circle.fill" size={18} color={Palette.neutral[400]} />
                    </TouchableOpacity>
                </View>
            )}

            {/* 카테고리 선택 */}
            {!location && (
                <>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryContainer}
                    >
                        {LOCATION_CATEGORIES.map((category) => (
                            <TouchableOpacity
                                key={category.id}
                                style={[
                                    styles.categoryButton,
                                    selectedCategory === category.id && styles.categoryButtonActive,
                                ]}
                                onPress={() => handleCategorySelect(category.id)}
                                disabled={disabled}
                            >
                                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                                <Text
                                    style={[
                                        styles.categoryLabel,
                                        selectedCategory === category.id && styles.categoryLabelActive,
                                    ]}
                                >
                                    {category.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* 직접 입력 */}
                    {showCustomInput && (
                        <TextInput
                            style={styles.customInput}
                            placeholder="장소명을 입력하세요"
                            placeholderTextColor={Palette.neutral[400]}
                            value={customLocationName}
                            onChangeText={handleCustomInputChange}
                            editable={!disabled}
                        />
                    )}

                    {/* 선택된 카테고리 표시 */}
                    {selectedCategory && selectedCategory !== 'other' && (
                        <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>
                                {LOCATION_CATEGORIES.find(c => c.id === selectedCategory)?.emoji}{' '}
                                {LOCATION_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                            </Text>
                        </View>
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.xl,
    },
    label: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginBottom: Spacing.sm,
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Palette.primary[50],
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.primary[200],
        marginBottom: Spacing.md,
    },
    gpsButtonLoading: {
        opacity: 0.7,
    },
    gpsButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
        color: Palette.primary[600],
    },
    errorText: {
        fontSize: FontSize.sm,
        color: Palette.status.error,
        marginBottom: Spacing.sm,
    },
    locationResult: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: '#E8F5E9',
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    locationResultText: {
        fontSize: FontSize.sm,
        color: Palette.status.success,
        fontWeight: FontWeight.medium,
        flex: 1,
    },
    categoryContainer: {
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    categoryButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        ...Shadows.sm,
    },
    categoryButtonActive: {
        backgroundColor: Palette.primary[500],
    },
    categoryEmoji: {
        fontSize: 16,
    },
    categoryLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
    },
    categoryLabelActive: {
        color: '#fff',
    },
    customInput: {
        marginTop: Spacing.md,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
        borderWidth: 1,
        borderColor: Palette.neutral[200],
    },
    selectedBadge: {
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Palette.primary[50],
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    selectedBadgeText: {
        fontSize: FontSize.sm,
        color: Palette.primary[600],
    },
});

export default LocationPicker;
