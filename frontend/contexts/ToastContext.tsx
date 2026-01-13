import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Palette, Spacing, BorderRadius, Shadows, FontSize, FontWeight } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(50)).current;

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now().toString();
        setToast({ id, message, type });

        // Reset animations
        fadeAnim.setValue(0);
        translateY.setValue(50);

        // Animate In
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto Hide
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 20,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => setToast(null));
        }, 3000);
    }, [fadeAnim, translateY]);

    const getIconName = (type: ToastType) => {
        switch (type) {
            case 'success': return 'checkmark.circle.fill';
            case 'error': return 'exclamationmark.circle.fill';
            default: return 'info.circle.fill';
        }
    };

    const getColors = (type: ToastType) => {
        switch (type) {
            case 'success': return { bg: '#E3F9E5', text: '#1F7A1F', icon: '#2DA44E' };
            case 'error': return { bg: '#FFEBE9', text: '#CF222E', icon: '#CF222E' };
            default: return { bg: '#E0F2FF', text: '#0969DA', icon: '#0969DA' };
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <View style={styles.container} pointerEvents="none">
                    <Animated.View
                        style={[
                            styles.toast,
                            { backgroundColor: getColors(toast.type).bg },
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY }],
                            },
                        ]}
                    >
                        <IconSymbol
                            name={getIconName(toast.type)}
                            size={20}
                            color={getColors(toast.type).icon}
                        />
                        <Text style={[styles.message, { color: getColors(toast.type).text }]}>
                            {toast.message}
                        </Text>
                    </Animated.View>
                </View>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 80, // TabBar 위에 표시
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
        ...Shadows.md,
        maxWidth: width - 40,
        gap: Spacing.sm,
    },
    message: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.medium,
    },
});
