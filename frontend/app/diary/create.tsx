import React, { useState, useCallback, useEffect, useRef } from 'react';
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
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { diaryService } from '@/services/api';
import { saveImageToOfflineStorage, cleanupUploadedImages } from '@/utils/imageStorage';
import { VoiceRecorder } from '@/components/diary/VoiceRecorder';
import { PreviewModal } from '@/components/diary/PreviewModal';
import { LocationPicker, LocationPickerValue } from '@/components/diary/LocationPicker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useFormErrors } from '@/hooks/useFormErrors';
import { FormFieldError } from '@/components/FormFieldError';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { isNetworkError } from '@/utils/errorHandler';

const DRAFT_KEY = 'diary_draft';

export default function CreateDiaryScreen() {
    const router = useRouter();
    const { isOffline, queueCreateDiary } = useOfflineQueue();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);

    // 날짜 선택 상태
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // 임시저장 타이머
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 새로운 폼 에러 훅 사용
    const {
        errors,
        setFieldError,
        clearFieldError,
        clearAllErrors,
        setErrorsFromResponse,
    } = useFormErrors();

    // 위치 관련 상태
    const [locationData, setLocationData] = useState<LocationPickerValue>({
        locationName: null,
        latitude: null,
        longitude: null,
    });

    // 임시저장 불러오기
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const draft = await AsyncStorage.getItem(DRAFT_KEY);
                if (draft) {
                    const parsed = JSON.parse(draft);
                    if (parsed.title || parsed.content) {
                        setHasDraft(true);
                        Alert.alert(
                            '임시저장 발견',
                            '작성 중이던 일기가 있습니다. 불러올까요?',
                            [
                                { text: '새로 작성', style: 'destructive', onPress: () => clearDraft() },
                                {
                                    text: '불러오기', onPress: () => {
                                        setTitle(parsed.title || '');
                                        setContent(parsed.content || '');
                                        if (parsed.date) setSelectedDate(new Date(parsed.date));
                                    }
                                },
                            ]
                        );
                    }
                }
            } catch (e) {
                console.error('Failed to load draft:', e);
            }
        };
        loadDraft();
    }, []);

    // 자동 임시저장 (3초 디바운스)
    useEffect(() => {
        if (draftTimerRef.current) {
            clearTimeout(draftTimerRef.current);
        }

        if (title || content) {
            draftTimerRef.current = setTimeout(async () => {
                try {
                    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
                        title,
                        content,
                        date: selectedDate.toISOString(),
                        savedAt: new Date().toISOString()
                    }));
                    setHasDraft(true);
                } catch (e) {
                    console.error('Failed to save draft:', e);
                }
            }, 3000);
        }

        return () => {
            if (draftTimerRef.current) {
                clearTimeout(draftTimerRef.current);
            }
        };
    }, [title, content, selectedDate]);

    // 임시저장 삭제
    const clearDraft = async () => {
        try {
            await AsyncStorage.removeItem(DRAFT_KEY);
            setHasDraft(false);
        } catch (e) {
            console.error('Failed to clear draft:', e);
        }
    };

    // 날짜 변경 핸들러
    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        // 미래 날짜는 선택 불가
        if (newDate <= new Date()) {
            setSelectedDate(newDate);
        }
    };

    // Image Picker Logic
    const pickImage = async () => {
        // Permission check
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('권한 필요', '사진을 첨부하려면 갤러리 접근 권한이 필요합니다.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Optional: crop
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            const uri = result.assets[0].uri;
            // Immediate persistence: Save to offline storage right away
            try {
                const persistentUri = await saveImageToOfflineStorage(uri);
                setImages((prev) => [...prev, persistentUri]);
            } catch (error) {
                console.error('Failed to save image:', error);
                Alert.alert('오류', '이미지를 저장하는 데 실패했습니다.');
            }
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleTranscription = useCallback((text: string, summary?: string) => {
        setContent((prev) => {
            let newContent = prev.trim() ? prev + '\n' + text : text;
            if (summary) {
                newContent += '\n\n[AI 요약]\n' + summary;
            }
            return newContent;
        });
    }, []);

    const handleLocationChange = useCallback((value: LocationPickerValue) => {
        setLocationData(value);
    }, []);

    const handleSavePress = () => {
        clearAllErrors();
        let hasError = false;

        if (!title.trim()) {
            setFieldError('title', '제목을 입력해주세요');
            hasError = true;
        }
        if (!content.trim()) {
            setFieldError('content', '내용을 입력해주세요');
            hasError = true;
        }

        if (hasError) return;

        setShowPreview(true);
    };

    const handleEdit = () => {
        setShowPreview(false);
    };

    const handleConfirmSave = async () => {
        setIsLoading(true);
        const diaryData = {
            title: title.trim(),
            content: content.trim(),
            location_name: locationData.locationName || null,
            latitude: locationData.latitude || null,
            longitude: locationData.longitude || null,
            images: images,
            created_at: selectedDate.toISOString(), // 선택한 날짜 전송
        };

        try {
            if (isOffline) {
                await queueCreateDiary(diaryData);
                await clearDraft(); // 임시저장 삭제
                setShowPreview(false);
                router.back();
                return;
            }

            await diaryService.create(diaryData);
            await clearDraft(); // 저장 성공 시 임시저장 삭제

            setShowPreview(false);
            Alert.alert('저장 완료 ✨', '일기가 안전하게 저장되었습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            if (isNetworkError(err)) {
                await queueCreateDiary(diaryData);
                await clearDraft();
                setShowPreview(false);
                router.back();
                return;
            }

            setErrorsFromResponse(err);
            setShowPreview(false);
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
                    {/* 날짜 선택기 */}
                    <View style={styles.dateHeader}>
                        <TouchableOpacity
                            style={styles.dateNavButton}
                            onPress={() => handleDateChange(-1)}
                        >
                            <Text style={styles.dateNavText}>◀</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)}>
                            <Text style={styles.dateText}>
                                {selectedDate.toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'long',
                                })}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dateNavButton}
                            onPress={() => handleDateChange(1)}
                            disabled={selectedDate.toDateString() === new Date().toDateString()}
                        >
                            <Text style={[
                                styles.dateNavText,
                                selectedDate.toDateString() === new Date().toDateString() && styles.dateNavDisabled
                            ]}>▶</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 임시저장 표시 */}
                    {hasDraft && (
                        <View style={styles.draftBadge}>
                            <Text style={styles.draftBadgeText}>💾 임시저장됨</Text>
                        </View>
                    )}

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

                    {/* 위치 선택 - LocationPicker 컴포넌트 */}
                    <LocationPicker
                        onChange={handleLocationChange}
                        disabled={isRecording}
                    />

                    {/* 제목 입력 */}
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[styles.titleInput, errors.title && styles.inputError]}
                            placeholder="오늘의 제목을 입력하세요"
                            placeholderTextColor={Palette.neutral[400]}
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (errors.title) clearFieldError('title');
                            }}
                            maxLength={200}
                            editable={!isRecording}
                        />
                        <FormFieldError error={errors.title} />
                    </View>


                    {/* 이미지 섹션 */}
                    <View style={styles.imageSection}>
                        <Text style={styles.imageSectionLabel}>사진 첨부</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
                            {images.map((uri, index) => (
                                <View key={index} style={styles.imagePreviewWrapper}>
                                    <Image source={{ uri }} style={styles.imagePreview} />
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <IconSymbol name="xmark" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.addImageButton} onPress={pickImage} disabled={isRecording}>
                            <IconSymbol name="photo.on.rectangle" size={20} color={Palette.neutral[600]} />
                            <Text style={styles.addImageText}>사진 추가하기</Text>
                        </TouchableOpacity>
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
                                if (errors.content) clearFieldError('content');
                            }}
                            multiline
                            textAlignVertical="top"
                            editable={!isRecording}
                        />
                        {/* 글자 수 표시 */}
                        <View style={styles.charCountContainer}>
                            <Text style={styles.charCountText}>
                                {content.length}글자
                            </Text>
                        </View>
                        <FormFieldError error={errors.content} />
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
                    images={images}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
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

    // 이미지 섹션
    imageSection: {
        marginBottom: Spacing.xl,
    },
    imageSectionLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginBottom: Spacing.sm,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    imagePreviewWrapper: {
        position: 'relative',
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    imagePreview: {
        width: 100,
        height: 100,
        backgroundColor: Palette.neutral[100],
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: Palette.neutral[200],
        ...Shadows.sm,
    },
    addImageText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        fontWeight: FontWeight.medium,
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

    // 날짜 네비게이션
    dateNavButton: {
        padding: Spacing.sm,
    },
    dateNavText: {
        fontSize: FontSize.lg,
        color: Palette.primary[500],
    },
    dateNavDisabled: {
        color: Palette.neutral[300],
    },

    // 임시저장 뱃지
    draftBadge: {
        backgroundColor: Palette.status.success + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
        marginBottom: Spacing.md,
    },
    draftBadgeText: {
        fontSize: FontSize.sm,
        color: Palette.status.success,
        fontWeight: FontWeight.medium,
    },

    // 글자 수 표시
    charCountContainer: {
        alignItems: 'flex-end',
        marginTop: Spacing.xs,
    },
    charCountText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[400],
    },
});
