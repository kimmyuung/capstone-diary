import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

// 키 이름
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

interface BiometricContextType {
    isBiometricSupported: boolean;
    isBiometricEnabled: boolean;
    isLocked: boolean;
    authenticate: () => Promise<boolean>;
    toggleBiometric: (enabled: boolean) => Promise<boolean>;
}

const BiometricContext = createContext<BiometricContextType | null>(null);

export function BiometricProvider({ children }: { children: React.ReactNode }) {
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // 앱 잠금 상태
    const appState = useRef(AppState.currentState);
    const router = useRouter();
    const segments = useSegments();

    // 초기화: 지원 여부 및 설정 로드
    useEffect(() => {
        const init = async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricSupported(compatible && enrolled);

            const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
            setIsBiometricEnabled(enabled === 'true');

            // 앱 시작 시 활성화되어 있다면 잠금
            if (enabled === 'true') {
                setIsLocked(true);
            }
        };
        init();
    }, []);

    // 앱 상태 모니터링 (백그라운드 -> 포그라운드 시 잠금)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // 포그라운드로 돌아왔을 때
                if (isBiometricEnabled) {
                    setIsLocked(true);
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [isBiometricEnabled]);

    // 인증 실행
    const authenticate = useCallback(async (): Promise<boolean> => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: '일기장 잠금 해제',
                fallbackLabel: '비밀번호 사용',
                cancelLabel: '취소',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setIsLocked(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Biometric auth failed', error);
            return false;
        }
    }, []);

    // 생체 인식 설정 토글
    const toggleBiometric = async (enabled: boolean): Promise<boolean> => {
        if (enabled) {
            // 활성화 시도 시 먼저 본인 인증
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: '생체 인식 활성화 인증',
            });
            if (!result.success) return false;
        }

        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
        setIsBiometricEnabled(enabled);
        return true;
    };

    // 잠금 상태일 때 잠금 화면으로 이동하거나 Overlay 표시
    // 여기서는 isLocked 상태만 제공하고, UI 처리는 별도 컴포넌트(BiometricGuard)에서 하거나
    // Root Layout에서 처리하도록 함.

    return (
        <BiometricContext.Provider
            value={{
                isBiometricSupported,
                isBiometricEnabled,
                isLocked,
                authenticate,
                toggleBiometric,
            }}
        >
            {children}
            {isLocked && <BiometricLockScreen onUnlock={authenticate} />}
        </BiometricContext.Provider>
    );
}

// 잠금 화면 컴포넌트 (내부 정의)
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Palette } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

function BiometricLockScreen({ onUnlock }: { onUnlock: () => void }) {
    // 앱 시작 시 자동 인증 시도
    useEffect(() => {
        onUnlock();
    }, []);

    return (
        <View style={styles.lockContainer}>
            <View style={styles.lockContent}>
                <IconSymbol name="lock.fill" size={60} color={Palette.primary[500]} />
                <Text style={styles.lockTitle}>일기장이 잠겨있습니다</Text>
                <Text style={styles.lockSubtitle}>
                    소중한 추억을 보호하기 위해{'\n'}생체 인식을 통해 잠금을 해제해주세요.
                </Text>

                <TouchableOpacity style={styles.unlockButton} onPress={onUnlock}>
                    <Text style={styles.unlockButtonText}>잠금 해제</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    lockContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
        zIndex: 99999, // 최상위
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
    },
    lockContent: {
        alignItems: 'center',
        padding: 40,
    },
    lockTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
        color: '#333',
    },
    lockSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    unlockButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    unlockButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export const useBiometric = () => {
    const context = useContext(BiometricContext);
    if (!context) {
        throw new Error('useBiometric must be used within a BiometricProvider');
    }
    return context;
};
