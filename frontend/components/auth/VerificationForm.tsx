import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { FormFieldError } from '@/components/FormFieldError';

interface VerificationFormProps {
    verificationCode: string;
    setVerificationCode: (text: string) => void;
    errors: {
        code?: string;
    };
    isLoading: boolean;
    onVerify: () => void;
    onResend: () => void;
}

export const VerificationForm = ({
    verificationCode, setVerificationCode,
    errors,
    isLoading,
    onVerify,
    onResend
}: VerificationFormProps) => {
    return (
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
                onPress={onVerify}
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
                onPress={onResend}
                disabled={isLoading}
            >
                <Text style={styles.resendButtonText}>인증 코드 다시 받기</Text>
            </TouchableOpacity>
        </>
    );
};

const styles = StyleSheet.create({
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
});
