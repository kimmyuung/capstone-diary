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
    Image, // Added Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; // Added ImagePicker
import { diaryService } from '@/services/api';
import { saveImageToOfflineStorage, cleanupUploadedImages } from '@/utils/imageStorage'; // Added Utils
import { VoiceRecorder } from '@/components/diary/VoiceRecorder';
import { PreviewModal } from '@/components/diary/PreviewModal';
import { LocationPicker, LocationPickerValue } from '@/components/diary/LocationPicker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useFormErrors } from '@/hooks/useFormErrors';
import { FormFieldError } from '@/components/FormFieldError';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { isNetworkError } from '@/utils/errorHandler';


export default function CreateDiaryScreen() {
    const router = useRouter();
    const { isOffline, queueCreateDiary } = useOfflineQueue();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]); // Added images state
    const [isRecording, setIsRecording] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 새로운 폼 에러 훅 사용
    const {
        errors,
        setFieldError,
        clearFieldError,
        clearAllErrors,
        setErrorsFromResponse,
    } = useFormErrors();

    // 위치 관련 상태 (LocationPicker에서 관리)
    const [locationData, setLocationData] = useState<LocationPickerValue>({
        locationName: null,
        latitude: null,
        longitude: null,
    });

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
            images: images, // Pass persistent URIs
        };

        try {
            // 오프라인이면 큐에 저장
            if (isOffline) {
                await queueCreateDiary(diaryData);
                setShowPreview(false);
                router.back();
                return;
            }

            await diaryService.create(diaryData);

            // Cleanup: If uploaded successfully, we could clean up local files.
            // But we might want to keep them just in case or for cache.
            // For now, let's just leave them or handle cleanup later.

            setShowPreview(false);
            Alert.alert('저장 완료 ✨', '일기가 안전하게 저장되었습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            // 네트워크 에러인 경우 오프라인 큐로
            if (isNetworkError(err)) {
                await queueCreateDiary(diaryData);
                setShowPreview(false);
                router.back();
                return;
            }

            // API 유효성 검증 에러 처리
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
});
