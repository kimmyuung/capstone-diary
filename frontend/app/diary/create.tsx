import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { diaryService } from '@/services/api';
import { VoiceRecorder } from '@/components/diary/VoiceRecorder';
import { PreviewModal } from '@/components/diary/PreviewModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

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

export default function CreateDiaryScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

    // 위치 관련 상태
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [locationName, setLocationName] = useState('');
    const [showLocationInput, setShowLocationInput] = useState(false);

    const handleTranscription = useCallback((text: string) => {
        setContent((prev) => {
            if (prev.trim()) {
                return prev + '\n' + text;
            }
            return text;
        });
    }, []);

    const handleLocationSelect = (locationId: string) => {
        if (selectedLocation === locationId) {
            setSelectedLocation(null);
            setShowLocationInput(false);
            setLocationName('');
        } else {
            setSelectedLocation(locationId);
            // 기타를 선택하면 직접 입력 표시
            if (locationId === 'other') {
                setShowLocationInput(true);
            } else {
                setShowLocationInput(false);
                const category = LOCATION_CATEGORIES.find(c => c.id === locationId);
                setLocationName(category?.label || '');
            }
        }
    };

    const handleSavePress = () => {
        const newErrors: { title?: string; content?: string } = {};

        if (!title.trim()) {
            newErrors.title = '제목을 입력해주세요';
        }
        if (!content.trim()) {
            newErrors.content = '내용을 입력해주세요';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setShowPreview(true);
    };

    const handleEdit = () => {
        setShowPreview(false);
    };

    const handleConfirmSave = async () => {
        setIsLoading(true);
        try {
            await diaryService.create({
                title: title.trim(),
                content: content.trim(),
                location_name: locationName.trim() || null,
            });
            setShowPreview(false);
            Alert.alert('저장 완료 ✨', '일기가 안전하게 저장되었습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('저장 실패', '일기 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelPreview = () => {
        setShowPreview(false);
    };

    // 오늘 날짜 포맷
    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    });

    return (
        <>
            <Stack.Screen
                options={{
                    title: '',
                    headerTransparent: true,
                    headerTintColor: Palette.neutral[800],
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={handleSavePress}
                            disabled={isRecording}
                            style={styles.headerButton}
                        >
                            <Text style={styles.headerButtonText}>완료</Text>
                        </TouchableOpacity>
                    ),
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    style={styles.scrollView}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* 날짜 헤더 */}
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateText}>{dateString}</Text>
                    </View>

                    {/* 기분 선택 */}
                    <View style={styles.moodSection}>
                        <Text style={styles.moodLabel}>오늘의 기분</Text>
                        <View style={styles.moodOptions}>
                            {['😊', '😢', '😡', '😴', '🥰', '😰'].map((emoji, index) => (
                                <TouchableOpacity key={index} style={styles.moodButton}>
                                    <Text style={styles.moodEmoji}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 위치 선택 */}
                    <View style={styles.locationSection}>
                        <Text style={styles.moodLabel}>📍 장소</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.locationOptions}
                        >
                            {LOCATION_CATEGORIES.map((loc) => (
                                <TouchableOpacity
                                    key={loc.id}
                                    style={[
                                        styles.locationButton,
                                        selectedLocation === loc.id && styles.locationButtonActive
                                    ]}
                                    onPress={() => handleLocationSelect(loc.id)}
                                >
                                    <Text style={styles.locationEmoji}>{loc.emoji}</Text>
                                    <Text style={[
                                        styles.locationLabel,
                                        selectedLocation === loc.id && styles.locationLabelActive
                                    ]}>
                                        {loc.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* 기타 선택 시 직접 입력 */}
                        {showLocationInput && (
                            <TextInput
                                style={styles.locationInput}
                                placeholder="장소명을 입력하세요"
                                placeholderTextColor={Palette.neutral[400]}
                                value={locationName}
                                onChangeText={setLocationName}
                            />
                        )}

                        {/* 선택된 위치 표시 */}
                        {selectedLocation && !showLocationInput && (
                            <View style={styles.selectedLocationBadge}>
                                <Text style={styles.selectedLocationText}>
                                    {LOCATION_CATEGORIES.find(c => c.id === selectedLocation)?.emoji} {locationName}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 제목 입력 */}
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[styles.titleInput, errors.title && styles.inputError]}
                            placeholder="오늘의 제목을 입력하세요"
                            placeholderTextColor={Palette.neutral[400]}
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (errors.title) setErrors({ ...errors, title: undefined });
                            }}
                            maxLength={200}
                            editable={!isRecording}
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* 내용 입력 */}
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[styles.contentInput, errors.content && styles.inputError]}
                            placeholder="오늘 하루는 어땠나요?&#10;자유롭게 적어보세요..."
                            placeholderTextColor={Palette.neutral[400]}
                            value={content}
                            onChangeText={(text) => {
                                setContent(text);
                                if (errors.content) setErrors({ ...errors, content: undefined });
                            }}
                            multiline
                            textAlignVertical="top"
                            editable={!isRecording}
                        />
                        {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
                    </View>

                    {/* 음성 녹음 */}
                    <VoiceRecorder
                        onTranscription={handleTranscription}
                        onRecordingStateChange={setIsRecording}
                        language="ko"
                    />

                    {/* 저장 버튼 */}
                    <TouchableOpacity
                        style={[styles.saveButton, isRecording && styles.saveButtonDisabled]}
                        onPress={handleSavePress}
                        disabled={isRecording || isLoading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={isRecording ? [Palette.neutral[300], Palette.neutral[400]] : [Palette.primary[400], Palette.primary[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveButtonGradient}
                        >
                            <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
                            <Text style={styles.saveButtonText}>저장하기</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* 보안 안내 */}
                    <View style={styles.securityBadge}>
                        <IconSymbol name="lock.fill" size={14} color={Palette.secondary[500]} />
                        <Text style={styles.securityText}>암호화되어 안전하게 보관됩니다</Text>
                    </View>
                </ScrollView>

                {/* 미리보기 모달 */}
                <PreviewModal
                    visible={showPreview}
                    title={title}
                    content={content}
                    onConfirm={handleConfirmSave}
                    onEdit={handleEdit}
                    onCancel={handleCancelPreview}
                    isLoading={isLoading}
                />
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBFA',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: 100,
    },
    headerButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    headerButtonText: {
        color: Palette.primary[500],
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
    },

    // 날짜 헤더
    dateHeader: {
        marginBottom: Spacing.xl,
    },
    dateText: {
        fontSize: FontSize.lg,
        color: Palette.neutral[600],
        fontWeight: FontWeight.medium,
    },

    // 기분 선택
    moodSection: {
        marginBottom: Spacing.xl,
    },
    moodLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginBottom: Spacing.sm,
    },
    moodOptions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    moodButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    moodEmoji: {
        fontSize: 24,
    },

    // 입력
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    titleInput: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
        paddingVertical: Spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: Palette.neutral[200],
    },
    contentInput: {
        fontSize: FontSize.lg,
        color: Palette.neutral[800],
        lineHeight: 28,
        minHeight: 200,
        paddingVertical: Spacing.md,
    },
    inputError: {
        borderBottomColor: Palette.status.error,
    },
    errorText: {
        color: Palette.status.error,
        fontSize: FontSize.sm,
        marginTop: Spacing.xs,
    },

    // 저장 버튼
    saveButton: {
        marginTop: Spacing.xl,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        ...Shadows.colored(Palette.primary[500]),
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },

    // 보안 배지
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xxxl,
    },
    securityText: {
        fontSize: FontSize.sm,
        color: Palette.secondary[500],
    },

    // 위치 선택
    locationSection: {
        marginBottom: Spacing.xl,
    },
    locationOptions: {
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    locationButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        ...Shadows.sm,
    },
    locationButtonActive: {
        backgroundColor: Palette.primary[500],
    },
    locationEmoji: {
        fontSize: 16,
    },
    locationLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
    },
    locationLabelActive: {
        color: '#fff',
    },
    locationInput: {
        marginTop: Spacing.md,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
        borderWidth: 1,
        borderColor: Palette.neutral[200],
    },
    selectedLocationBadge: {
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Palette.primary[50],
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    selectedLocationText: {
        fontSize: FontSize.sm,
        color: Palette.primary[600],
    },
});
