import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { FormFieldError } from '@/components/FormFieldError';
import { useRegister } from '@/hooks/useRegister';

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
                                        <FormFieldError error={errors.username} />
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
                                        <FormFieldError error={errors.email} />
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
                                        <FormFieldError error={errors.password} />
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
                                        <FormFieldError error={errors.passwordConfirm} />
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
                                        <FormFieldError error={errors.code} />
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
