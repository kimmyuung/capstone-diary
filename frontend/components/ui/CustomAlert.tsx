import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Palette, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/theme';

export type AlertType = 'success' | 'error' | 'info';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: AlertType;
    confirmText?: string;
    onConfirm: () => void;
}

export const CustomAlert = ({
    visible,
    title,
    message,
    type = 'info',
    confirmText = '확인',
    onConfirm,
}: CustomAlertProps) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onConfirm}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={[styles.header, { backgroundColor: getTypeColor(type) }]}>
                        <Text style={styles.title}>{title}</Text>
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.message}>{message}</Text>
                    </View>
                    <TouchableOpacity style={styles.button} onPress={onConfirm}>
                        <Text style={[styles.buttonText, { color: getTypeColor(type) }]}>
                            {confirmText}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const getTypeColor = (type: AlertType) => {
    switch (type) {
        case 'success':
            return Palette.status.success;
        case 'error':
            return Palette.status.error;
        case 'info':
        default:
            return Palette.primary[500];
    }
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    container: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.lg,
    },
    header: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    content: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    message: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
        textAlign: 'center',
        lineHeight: 24,
    },
    button: {
        borderTopWidth: 1,
        borderTopColor: Palette.neutral[200],
        padding: Spacing.lg,
        alignItems: 'center',
        backgroundColor: '#fff', // 터치 피드백을 위해 배경색 지정
    },
    buttonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
});
