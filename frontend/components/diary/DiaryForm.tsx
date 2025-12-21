import React, { useState } from 'react';
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
} from 'react-native';

interface DiaryFormProps {
    initialTitle?: string;
    initialContent?: string;
    onSubmit: (title: string, content: string) => Promise<void>;
    submitButtonText?: string;
    isLoading?: boolean;
}

export const DiaryForm: React.FC<DiaryFormProps> = ({
    initialTitle = '',
    initialContent = '',
    onSubmit,
    submitButtonText = '저장',
    isLoading = false,
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

    const validate = () => {
        const newErrors: { title?: string; content?: string } = {};

        if (!title.trim()) {
            newErrors.title = '제목을 입력해주세요';
        } else if (title.length > 200) {
            newErrors.title = '제목은 200자 이내로 입력해주세요';
        }

        if (!content.trim()) {
            newErrors.content = '내용을 입력해주세요';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        await onSubmit(title.trim(), content.trim());
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
                            if (errors.title) setErrors({ ...errors, title: undefined });
                        }}
                        maxLength={200}
                        editable={!isLoading}
                    />
                    {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
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
                            if (errors.content) setErrors({ ...errors, content: undefined });
                        }}
                        multiline
                        numberOfLines={10}
                        textAlignVertical="top"
                        editable={!isLoading}
                    />
                    {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
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
};

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
