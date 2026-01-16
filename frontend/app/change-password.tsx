import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, Spacing, BorderRadius, FontSize } from '@/constants/theme';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { isDark } = useTheme();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChangePassword = async () => {
        setError('');

        // 유효성 검사
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('모든 필드를 입력해주세요.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        if (newPassword.length < 8) {
            setError('새 비밀번호는 최소 8자 이상이어야 합니다.');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/api/password/change/', {
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });

            Alert.alert(
                '성공',
                response.data.message || '비밀번호가 변경되었습니다.',
                [{ text: '확인', onPress: () => router.back() }]
            );
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || '비밀번호 변경에 실패했습니다.';
            if (Array.isArray(errorMessage)) {
                setError(errorMessage.join('\n'));
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <IconSymbol name="chevron.left" size={24} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, isDark && styles.textDark]}>비밀번호 변경</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Current Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, isDark && styles.textDark]}>현재 비밀번호</Text>
                            <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    placeholder="현재 비밀번호 입력"
                                    placeholderTextColor={isDark ? '#888' : '#999'}
                                    secureTextEntry={!showCurrentPassword}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    <IconSymbol
                                        name={showCurrentPassword ? "eye.slash" : "eye"}
                                        size={20}
                                        color={isDark ? '#888' : '#666'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, isDark && styles.textDark]}>새 비밀번호</Text>
                            <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    placeholder="새 비밀번호 입력 (8자 이상)"
                                    placeholderTextColor={isDark ? '#888' : '#999'}
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                    <IconSymbol
                                        name={showNewPassword ? "eye.slash" : "eye"}
                                        size={20}
                                        color={isDark ? '#888' : '#666'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, isDark && styles.textDark]}>새 비밀번호 확인</Text>
                            <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    placeholder="새 비밀번호 다시 입력"
                                    placeholderTextColor={isDark ? '#888' : '#999'}
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <IconSymbol
                                        name={showConfirmPassword ? "eye.slash" : "eye"}
                                        size={20}
                                        color={isDark ? '#888' : '#666'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>비밀번호 변경</Text>
                            )}
                        </TouchableOpacity>

                        {/* Password Requirements */}
                        <View style={styles.requirements}>
                            <Text style={[styles.requirementsTitle, isDark && styles.textMuted]}>
                                비밀번호 요구사항
                            </Text>
                            <Text style={[styles.requirementItem, isDark && styles.textMuted]}>
                                • 최소 8자 이상
                            </Text>
                            <Text style={[styles.requirementItem, isDark && styles.textMuted]}>
                                • 숫자 포함 권장
                            </Text>
                            <Text style={[styles.requirementItem, isDark && styles.textMuted]}>
                                • 특수문자 포함 권장
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#121212',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
        paddingTop: Spacing.md,
    },
    backButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontWeight: 'bold',
        color: '#000',
    },
    placeholder: {
        width: 40,
    },
    textDark: {
        color: '#fff',
    },
    textMuted: {
        color: '#888',
    },
    form: {
        flex: 1,
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.lg,
    },
    errorText: {
        color: '#c62828',
        fontSize: FontSize.sm,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    inputContainerDark: {
        backgroundColor: '#2a2a2a',
        borderColor: '#444',
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: '#000',
    },
    inputDark: {
        color: '#fff',
    },
    submitButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
    requirements: {
        marginTop: Spacing.xl,
        padding: Spacing.md,
        backgroundColor: '#f8f9fa',
        borderRadius: BorderRadius.md,
    },
    requirementsTitle: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        color: '#666',
    },
    requirementItem: {
        fontSize: FontSize.sm,
        color: '#888',
        marginBottom: 4,
    },
});
