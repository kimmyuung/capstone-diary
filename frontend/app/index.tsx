import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'has_seen_onboarding';

export default function Index() {
    const { isAuthenticated, loading } = useAuth();
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const value = await AsyncStorage.getItem(ONBOARDING_KEY);
            setHasSeenOnboarding(value === 'true');
        } catch (error) {
            console.error('Failed to check onboarding status:', error);
            setHasSeenOnboarding(true); // 에러 시 온보딩 스킵
        }
    };

    if (loading || hasSeenOnboarding === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // 온보딩을 아직 보지 않았다면 온보딩 화면으로
    if (!hasSeenOnboarding) {
        return <Redirect href={"/onboarding" as any} />;
    }

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    // 이미 로그인이 되어있다면 메인 탭으로 이동
    return <Redirect href="/(tabs)" />;
}
