import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { diaryService, Diary } from '@/services/api';
import { LocationPicker, LocationPickerValue } from '@/components/diary/LocationPicker';
import { FormFieldError } from '@/components/FormFieldError';
import { useFormErrors } from '@/hooks/useFormErrors';

export default function EditDiaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [diary, setDiary] = useState<Diary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 폼 상태
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [locationData, setLocationData] = useState<LocationPickerValue>({
        locationName: null,
        latitude: null,
        longitude: null,
    });

    const {
        errors,
        setFieldError,
        clearFieldError,
        clearAllErrors,
        setErrorsFromResponse,
    } = useFormErrors();

    useEffect(() => {
        fetchDiary();
    }, [id]);

    const fetchDiary = async () => {
        try {
            const data = await diaryService.getById(Number(id));
            setDiary(data);
            setTitle(data.title);
            setContent(data.content);
            setLocationData({
                locationName: data.location_name,
                latitude: data.latitude,
                longitude: data.longitude,
            });
        } catch (err) {
            console.error('Failed to fetch diary:', err);
            Alert.alert('오류', '일기를 불러오는데 실패했습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleLocationChange = useCallback((value: LocationPickerValue) => {
        setLocationData(value);
    }, []);

    const handleSubmit = async () => {
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

        setIsSubmitting(true);
        try {
            await diaryService.update(Number(id), {
                title: title.trim(),
                content: content.trim(),
                location_name: locationData.locationName || null,
                latitude: locationData.latitude || null,
                longitude: locationData.longitude || null,
            });
            Alert.alert('성공', '일기가 수정되었습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            console.error('Failed to update diary:', err);
            setErrorsFromResponse(err);
            Alert.alert('오류', '일기 수정에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    if (!diary) {
        return null;
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: '일기 수정',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#333',
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                    {/* 제목 입력 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>제목</Text>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            placeholder="제목을 입력하세요"
                            placeholderTextColor="#999"
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (errors.title) clearFieldError('title');
                            }}
                            maxLength={200}
                            editable={!isSubmitting}
                        />
                        <FormFieldError error={errors.title} />
                    </View>

                    {/* 위치 선택 */}
                    <LocationPicker
                        initialValue={locationData}
                        onChange={handleLocationChange}
                        disabled={isSubmitting}
                    />

                    {/* 내용 입력 */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>내용</Text>
                        <TextInput
                            style={[styles.textArea, errors.content && styles.inputError]}
                            placeholder="오늘 하루는 어땠나요?"
                            placeholderTextColor="#999"
                            value={content}
                            onChangeText={(text) => {
                                setContent(text);
                                if (errors.content) clearFieldError('content');
                            }}
                            multiline
                            numberOfLines={10}
                            textAlignVertical="top"
                            editable={!isSubmitting}
                        />
                        <FormFieldError error={errors.content} />
                    </View>

                    {/* 저장 버튼 */}
                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>수정 완료</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    textArea: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minHeight: 200,
    },
    inputError: {
        borderColor: '#FF6B6B',
    },
    submitButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
