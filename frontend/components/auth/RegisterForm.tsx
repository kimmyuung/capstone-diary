import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { FormFieldError } from '@/components/FormFieldError';
import { PasswordInput } from '@/components/ui/PasswordInput';

// 이메일 인증 상태 타입
type EmailVerificationStatus = 'required' | 'pending' | 'verified';

// Define Props Interface
interface RegisterFormProps {
    username: string;
    setUsername: (text: string) => void;
    email: string;
    setEmail: (text: string) => void;
    password: string;
    setPassword: (text: string) => void;
    passwordConfirm: string;
    setPasswordConfirm: (text: string) => void;
    errors: {
        username?: string;
        email?: string;
        password?: string;
        passwordConfirm?: string;
        code?: string;
    };
    isLoading: boolean;
    onSubmit: () => void;
    emailVerificationStatus?: EmailVerificationStatus;
    onResendEmail?: () => void;
}

// 상태별 뱃지 텍스트와 색상
const getStatusBadge = (status: EmailVerificationStatus) => {
    switch (status) {
        case 'verified':
            return { text: '인증됨', color: Palette.status.success };
        case 'pending':
            return { text: '인증 요청 중', color: Palette.status.warning };
        case 'required':
        default:
            return { text: '인증필요', color: Palette.status.error };
    }
};

export const RegisterForm = ({
    username, setUsername,
    email, setEmail,
    password, setPassword,
    passwordConfirm, setPasswordConfirm,
    errors,
    isLoading,
    onSubmit,
    emailVerificationStatus = 'required',
    onResendEmail
}: RegisterFormProps) => {
    const statusBadge = getStatusBadge(emailVerificationStatus);
    const showResendButton = emailVerificationStatus !== 'verified' && onResendEmail;

    return (
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
                <View style={styles.labelRow}>
                    <Text style={styles.label}>
                        이메일 <Text style={styles.required}>*필수</Text>
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                            {statusBadge.text}
                        </Text>
                    </View>
                </View>
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

                {/* 이메일 재전송 버튼 */}
                {showResendButton && email.trim() && (
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={onResendEmail}
                        disabled={isLoading}
                    >
                        <Text style={styles.resendButtonText}>
                            {emailVerificationStatus === 'pending'
                                ? '📧 인증 메일 다시 보내기'
                                : '📧 인증 메일 보내기'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <PasswordInput
                    hasError={!!errors.password}
                    placeholder="8자 이상"
                    placeholderTextColor={Palette.neutral[400]}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                />
                {/* 비밀번호 강도 표시기 */}
                {password.length > 0 && (
                    <View style={styles.strengthContainer}>
                        <View style={styles.strengthBar}>
                            <View style={[
                                styles.strengthFill,
                                {
                                    width: password.length < 8 ? '33%' : password.length < 12 ? '66%' : '100%',
                                    backgroundColor: password.length < 8 ? Palette.status.error : password.length < 12 ? Palette.status.warning : Palette.status.success
                                }
                            ]} />
                        </View>
                        <Text style={[
                            styles.strengthText,
                            { color: password.length < 8 ? Palette.status.error : password.length < 12 ? Palette.status.warning : Palette.status.success }
                        ]}>
                            {password.length < 8 ? '약함' : password.length < 12 ? '보통' : '강함'}
                        </Text>
                    </View>
                )}
                <FormFieldError error={errors.password} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <PasswordInput
                    hasError={!!errors.passwordConfirm}
                    placeholder="비밀번호를 다시 입력하세요"
                    placeholderTextColor={Palette.neutral[400]}
                    value={passwordConfirm}
                    onChangeText={setPasswordConfirm}
                    editable={!isLoading}
                />
                <FormFieldError error={errors.passwordConfirm} />
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={onSubmit}
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
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
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
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    statusBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
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
    inputError: {
        borderColor: Palette.status.error,
    },
    resendButton: {
        marginTop: Spacing.sm,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    resendButtonText: {
        fontSize: FontSize.sm,
        color: Palette.primary[500],
        fontWeight: FontWeight.medium,
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
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        backgroundColor: Palette.neutral[200],
        borderRadius: 2,
        marginRight: Spacing.sm,
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
        width: 35,
    },
});
