import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FormFieldError } from '@/components/FormFieldError';
import { useFormErrors } from '@/hooks/useFormErrors';

interface ImageAsset {
    uri: string;
    type?: string;
    fileName?: string;
}

interface DiaryFormProps {
    initialTitle?: string;
    initialContent?: string;
    onSubmit: (title: string, content: string, images?: ImageAsset[]) => Promise<void>;
    submitButtonText?: string;
    isLoading?: boolean;
    /** 외부에서 전달된 API 에러 (VALIDATION_ERROR 등) */
    apiError?: unknown;
}

/** DiaryForm의 외부 인터페이스 */
export interface DiaryFormRef {
    setApiError: (error: unknown) => void;
    clearErrors: () => void;
}

export const DiaryForm = forwardRef<DiaryFormRef, DiaryFormProps>(({
    initialTitle = '',
    initialContent = '',
    onSubmit,
    submitButtonText = '저장',
    isLoading = false,
    apiError,
}, ref) => {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [images, setImages] = useState<ImageAsset[]>([]);

    // 새로운 폼 에러 훅 사용
    const {
        errors,
        setFieldError,
        clearFieldError,
        clearAllErrors,
        setErrorsFromResponse,
    } = useFormErrors();

    // 외부에서 전달된 API 에러 처리
    useEffect(() => {
        if (apiError) {
            setErrorsFromResponse(apiError);
        }
    }, [apiError, setErrorsFromResponse]);

    // 외부에서 에러를 설정할 수 있도록 ref 제공
    useImperativeHandle(ref, () => ({
        setApiError: (error: unknown) => {
            setErrorsFromResponse(error);
        },
        clearErrors: () => {
            clearAllErrors();
        },
    }), [setErrorsFromResponse, clearAllErrors]);

    const validate = () => {
        clearAllErrors();
        let isValid = true;

        if (!title.trim()) {
            setFieldError('title', '제목을 입력해주세요');
            isValid = false;
        } else if (title.length > 200) {
            setFieldError('title', '제목은 200자 이내로 입력해주세요');
            isValid = false;
        }

        if (!content.trim()) {
            setFieldError('content', '내용을 입력해주세요');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        await onSubmit(title.trim(), content.trim(), images.length > 0 ? images : undefined);
    };

    const pickImage = async () => {
        if (images.length >= 5) {
            Alert.alert('알림', '이미지는 최대 5장까지 첨부할 수 있습니다.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5 - images.length,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.mimeType || 'image/jpeg',
                fileName: asset.fileName || `image_${Date.now()}.jpg`,
            }));
            setImages([...images, ...newImages].slice(0, 5));
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>제목</Text>
                    <TextInput
                        style={[styles.input, errors.title && styles.inputError]}
                        placeholder="오늘의 일기 제목을 입력하세요"
                        placeholderTextColor="#999"
                        value={title}
                        onChangeText={(text) => {
                            setTitle(text);
                            if (errors.title) clearFieldError('title');
                        }}
                        maxLength={200}
                        editable={!isLoading}
                    />
                    <FormFieldError error={errors.title} />
                    <Text style={styles.charCount}>{title.length}/200</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>내용</Text>
                    <TextInput
                        style={[styles.textArea, errors.content && styles.inputError]}
                        placeholder="오늘 하루는 어땠나요? 자유롭게 작성해보세요..."
                        placeholderTextColor="#999"
                        value={content}
                        onChangeText={(text) => {
                            setContent(text);
                            if (errors.content) clearFieldError('content');
                        }}
                        multiline
                        numberOfLines={10}
                        textAlignVertical="top"
                        editable={!isLoading}
                    />
                    <FormFieldError error={errors.content} />
                </View>

                {/* 이미지 첨부 섹션 */}
                <View style={styles.inputGroup}>
                    <View style={styles.imageHeader}>
                        <Text style={styles.label}>📷 이미지 첨부</Text>
                        <Text style={styles.imageCount}>{images.length}/5</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                        {/* 첨부된 이미지들 */}
                        {images.map((image, index) => (
                            <View key={index} style={styles.imageWrapper}>
                                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeImage(index)}
                                >
                                    <IconSymbol name="xmark.circle.fill" size={22} color="#FF6B6B" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* 이미지 추가 버튼 */}
                        {images.length < 5 && (
                            <TouchableOpacity
                                style={styles.addImageButton}
                                onPress={pickImage}
                                disabled={isLoading}
                            >
                                <IconSymbol name="plus" size={28} color="#6C63FF" />
                                <Text style={styles.addImageText}>추가</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>{submitButtonText}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
});


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        padding: 16,
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
    errorText: {
        color: '#FF6B6B',
        fontSize: 12,
        marginTop: 4,
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    imageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    imageCount: {
        fontSize: 14,
        color: '#666',
    },
    imageScroll: {
        marginTop: 8,
    },
    imageWrapper: {
        marginRight: 12,
        position: 'relative',
    },
    imagePreview: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#fff',
        borderRadius: 11,
    },
    addImageButton: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#6C63FF',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f7ff',
    },
    addImageText: {
        fontSize: 12,
        color: '#6C63FF',
        marginTop: 4,
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

export default DiaryForm;

