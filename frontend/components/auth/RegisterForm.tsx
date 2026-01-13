import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { FormFieldError } from '@/components/FormFieldError';
import { RegisterFormHook } from '@/hooks/useRegister'; // Assuming useRegister types might be exported later or defining here

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
}

export const RegisterForm = ({
    username, setUsername,
    email, setEmail,
    password, setPassword,
    passwordConfirm, setPasswordConfirm,
    errors,
    isLoading,
    onSubmit
}: RegisterFormProps) => {
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
});
