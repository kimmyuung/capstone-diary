import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useRegister } from '@/hooks/useRegister';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { VerificationForm } from '@/components/auth/VerificationForm';

export default function RegisterScreen() {
    const router = useRouter();
    const {
        step,
        username, setUsername,
        email, setEmail,
        password, setPassword,
        passwordConfirm, setPasswordConfirm,
        verificationCode, setVerificationCode,
        isLoading,
        errors,
        handleRegister,
        handleVerify,
        handleResend,
    } = useRegister();

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
                                <RegisterForm
                                    username={username}
                                    setUsername={setUsername}
                                    email={email}
                                    setEmail={setEmail}
                                    password={password}
                                    setPassword={setPassword}
                                    passwordConfirm={passwordConfirm}
                                    setPasswordConfirm={setPasswordConfirm}
                                    errors={errors}
                                    isLoading={isLoading}
                                    onSubmit={handleRegister}
                                />
                            ) : (
                                <VerificationForm
                                    verificationCode={verificationCode}
                                    setVerificationCode={setVerificationCode}
                                    errors={errors}
                                    isLoading={isLoading}
                                    onVerify={handleVerify}
                                    onResend={handleResend}
                                />
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
