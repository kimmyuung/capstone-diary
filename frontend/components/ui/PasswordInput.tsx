import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps, Text } from 'react-native';
import { Palette, FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
    hasError?: boolean;
}

/**
 * 비밀번호 입력 컴포넌트 (표시/숨기기 토글 포함)
 */
export const PasswordInput = ({ hasError, style, ...props }: PasswordInputProps) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    return (
        <View style={styles.container}>
            <TextInput
                {...props}
                style={[styles.input, hasError && styles.inputError, style]}
                secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.toggleIcon}>
                    {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    input: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        paddingRight: 50,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
        borderWidth: 1.5,
        borderColor: Palette.neutral[200],
    },
    inputError: {
        borderColor: Palette.status.error,
    },
    toggleButton: {
        position: 'absolute',
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        width: 32,
    },
    toggleIcon: {
        fontSize: 18,
        opacity: 0.7,
    },
});

