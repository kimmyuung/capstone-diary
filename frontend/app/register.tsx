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
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const API_BASE_URL = 'http://localhost:8000';

type Step = 'form' | 'verify';

export default function RegisterScreen() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('form');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!username.trim()) {
            newErrors.username = '아이디를 입력해주세요';
        } else if (username.length < 3) {
            newErrors.username = '아이디는 3자 이상이어야 합니다';
        }

        if (!email.trim()) {
            newErrors.email = '이메일을 입력해주세요 (필수)';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = '올바른 이메일 형식이 아닙니다';
        }

        if (!password) {
            newErrors.password = '비밀번호를 입력해주세요';
        } else if (password.length < 8) {
            newErrors.password = '비밀번호는 8자 이상이어야 합니다';
        }

        if (!passwordConfirm) {
            newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요';
        } else if (password !== passwordConfirm) {
            newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Step 1: 회원가입 요청 (이메일 인증코드 전송)
    const handleRegister = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        setErrors({});
        try {
            await axios.post(`${API_BASE_URL}/api/register/`, {
                username: username.trim(),
                email: email.trim(),
                password,
                password_confirm: passwordConfirm,
            });

            // 인증 코드 입력 단계로 이동
            setStep('verify');
            Alert.alert('인증 코드 전송', '이메일로 6자리 인증 코드가 전송되었습니다.');
        } catch (err: any) {
            const errorData = err.response?.data;
            if (errorData) {
                const newErrors: Record<string, string> = {};
                Object.entries(errorData).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        newErrors[key] = value[0];
                    } else if (typeof value === 'string') {
                        newErrors[key] = value;
                    }
                });
                setErrors(newErrors);
            } else {
                Alert.alert('오류', '회원가입 중 문제가 발생했습니다');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: 이메일 인증 코드 확인
    const handleVerify = async () => {
        if (!verificationCode.trim()) {
            setErrors({ code: '인증 코드를 입력해주세요' });
            return;
        }

        setIsLoading(true);
        setErrors({});
        try {
            await axios.post(`${API_BASE_URL}/api/email/verify/`, {
                email: email.trim(),
                code: verificationCode.trim(),
            });

            Alert.alert(
                '회원가입 완료',
                '이메일 인증이 완료되었습니다. 로그인해주세요.',
                [{ text: '확인', onPress: () => router.replace('/login' as any) }]
            );
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || '인증에 실패했습니다';
            setErrors({ code: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    // 인증 코드 재전송
    const handleResend = async () => {
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/email/resend/`, {
                email: email.trim(),
            });
            Alert.alert('재전송 완료', '인증 코드가 다시 전송되었습니다.');
        } catch (err) {
            Alert.alert('오류', '재전송에 실패했습니다');
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
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 헤더 영역 */}
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <Text style={styles.logo}>{step === 'form' ? '📔' : '✉️'}</Text>
                            </View>
                            <Text style={styles.title}>
                                {step === 'form' ? '회원가입' : '이메일 인증'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {step === 'form'
                                    ? '감성 일기를 시작하세요'
                                    : `${email}로 전송된\n인증 코드를 입력해주세요`}
                            </Text>
                        </View>

                        {/* 폼 카드 */}
                        <View style={styles.formCard}>
                            {step === 'form' ? (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>아이디</Text>
                                        <TextInput
                                            style={[styles.input, errors.username && styles.inputError]}
                                            placeholder="영문, 숫자 3자 이상"
                                            placeholderTextColor={Palette.neutral[400]}
                                            value={username}
                                            onChangeText={setUsername}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!isLoading}
                                        />
                                        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>이메일 <Text style={styles.required}>*필수</Text></Text>
                                        <TextInput
                                            style={[styles.input, errors.email && styles.inputError]}
                                            placeholder="example@email.com"
                                            placeholderTextColor={Palette.neutral[400]}
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!isLoading}
                                        />
                                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>비밀번호</Text>
                                        <TextInput
                                            style={[styles.input, errors.password && styles.inputError]}
                                            placeholder="8자 이상"
                                            placeholderTextColor={Palette.neutral[400]}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            editable={!isLoading}
                                        />
                                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>비밀번호 확인</Text>
                                        <TextInput
                                            style={[styles.input, errors.passwordConfirm && styles.inputError]}
                                            placeholder="비밀번호를 다시 입력하세요"
                                            placeholderTextColor={Palette.neutral[400]}
                                            value={passwordConfirm}
                                            onChangeText={setPasswordConfirm}
                                            secureTextEntry
                                            editable={!isLoading}
                                        />
                                        {errors.passwordConfirm && <Text style={styles.errorText}>{errors.passwordConfirm}</Text>}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.button, isLoading && styles.buttonDisabled]}
                                        onPress={handleRegister}
                                        disabled={isLoading}
                                    >
                                        <LinearGradient
                                            colors={[Palette.secondary[400], Palette.secondary[500]]}
                                            style={styles.buttonGradient}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.buttonText}>가입하기</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>인증 코드 (6자리)</Text>
                                        <TextInput
                                            style={[styles.input, styles.codeInput, errors.code && styles.inputError]}
                                            placeholder="123456"
                                            placeholderTextColor={Palette.neutral[400]}
                                            value={verificationCode}
                                            onChangeText={setVerificationCode}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            editable={!isLoading}
                                        />
                                        {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.button, isLoading && styles.buttonDisabled]}
                                        onPress={handleVerify}
                                        disabled={isLoading}
                                    >
                                        <LinearGradient
                                            colors={[Palette.primary[400], Palette.primary[500]]}
                                            style={styles.buttonGradient}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.buttonText}>인증 완료</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.resendButton}
                                        onPress={handleResend}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.resendButtonText}>인증 코드 다시 받기</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* 푸터 */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                이미 계정이 있으신가요?{' '}
                                <Text
                                    style={styles.loginLink}
                                    onPress={() => router.replace('/login' as any)}
                                >
                                    로그인
                                </Text>
                            </Text>
                        </View>
                    </ScrollView>
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
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xxl,
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
    required: {
        color: Palette.status.error,
        fontSize: FontSize.xs,
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
    codeInput: {
        fontSize: FontSize.xxl,
        textAlign: 'center',
        letterSpacing: 8,
    },
    inputError: {
        borderColor: Palette.status.error,
    },
    errorText: {
        fontSize: FontSize.xs,
        color: Palette.status.error,
        marginTop: Spacing.xs,
    },
    button: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
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
    footerText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
    },
    loginLink: {
        color: Palette.primary[500],
        fontWeight: FontWeight.bold,
    },
});
