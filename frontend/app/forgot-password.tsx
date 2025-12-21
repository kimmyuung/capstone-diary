import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const API_BASE_URL = 'http://localhost:8000';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1: 이메일로 인증 코드 요청
    const handleRequestCode = async () => {
        if (!email.trim()) {
            setError('이메일을 입력해주세요');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await axios.post(`${API_BASE_URL}/api/password/reset-request/`, {
                email: email.trim(),
            });
            setStep('code');
            Alert.alert('알림', '인증 코드가 이메일로 전송되었습니다.');
        } catch (err: any) {
            setError(err.response?.data?.error || '오류가 발생했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: 인증 코드 확인 후 비밀번호 재설정
    const handleResetPassword = async () => {
        if (!code.trim()) {
            setError('인증 코드를 입력해주세요');
            return;
        }
        if (!newPassword) {
            setError('새 비밀번호를 입력해주세요');
            return;
        }
        if (newPassword.length < 8) {
            setError('비밀번호는 8자 이상이어야 합니다');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await axios.post(`${API_BASE_URL}/api/password/reset-confirm/`, {
                email: email.trim(),
                code: code.trim(),
                new_password: newPassword,
            });
            Alert.alert(
                '완료',
                '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.',
                [{ text: '확인', onPress: () => router.replace('/login' as any) }]
            );
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData?.error) {
                if (Array.isArray(errorData.error)) {
                    setError(errorData.error.join('\n'));
                } else {
                    setError(errorData.error);
                }
            } else {
                setError('오류가 발생했습니다');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <LinearGradient
                colors={['#FFE5E5', '#FFF5F3', '#F5E6FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logo}>🔐</Text>
                        </View>
                        <Text style={styles.title}>비밀번호 찾기</Text>
                        <Text style={styles.subtitle}>
                            {step === 'email' && '가입한 이메일을 입력해주세요'}
                            {step === 'code' && '이메일로 받은 인증 코드와\n새 비밀번호를 입력해주세요'}
                        </Text>
                    </View>

                    {/* 폼 카드 */}
                    <View style={styles.formCard}>
                        {/* Step 1: 이메일 입력 */}
                        {step === 'email' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>이메일</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="example@email.com"
                                        placeholderTextColor={Palette.neutral[400]}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                    />
                                </View>

                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleRequestCode}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={[Palette.primary[400], Palette.primary[500]]}
                                        style={styles.buttonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.buttonText}>인증 코드 받기</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Step 2: 인증 코드 + 새 비밀번호 */}
                        {step === 'code' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>인증 코드 (6자리)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="123456"
                                        placeholderTextColor={Palette.neutral[400]}
                                        value={code}
                                        onChangeText={setCode}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        editable={!isLoading}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>새 비밀번호</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="8자 이상"
                                        placeholderTextColor={Palette.neutral[400]}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry
                                        editable={!isLoading}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>비밀번호 확인</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="비밀번호를 다시 입력하세요"
                                        placeholderTextColor={Palette.neutral[400]}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                        editable={!isLoading}
                                    />
                                </View>

                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                >
                                    <LinearGradient
                                        colors={[Palette.secondary[400], Palette.secondary[500]]}
                                        style={styles.buttonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.buttonText}>비밀번호 변경</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.resendButton}
                                    onPress={handleRequestCode}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.resendButtonText}>인증 코드 다시 받기</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* 푸터 */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.backLink}>← 로그인으로 돌아가기</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        ...Shadows.lg,
    },
    logo: {
        fontSize: 40,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        textAlign: 'center',
        lineHeight: 22,
    },
    formCard: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        ...Shadows.lg,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
        borderWidth: 1.5,
        borderColor: Palette.neutral[200],
    },
    errorText: {
        color: Palette.status.error,
        fontSize: FontSize.sm,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    button: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginTop: Spacing.md,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    resendButton: {
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    resendButtonText: {
        color: Palette.primary[500],
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    footer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    backLink: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
    },
});
