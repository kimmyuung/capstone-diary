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
