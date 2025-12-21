import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!username.trim()) {
            Alert.alert('알림', '사용자 이름을 입력해주세요');
            return;
        }
        if (!password) {
            Alert.alert('알림', '비밀번호를 입력해주세요');
            return;
        }

        setIsLoading(true);
        try {
            const success = await login(username.trim(), password);
            if (success) {
                router.replace('/' as any);
            } else {
                Alert.alert('로그인 실패', '아이디 또는 비밀번호를 확인해주세요');
            }
        } catch (err) {
            Alert.alert('오류', '로그인 중 문제가 발생했습니다');
        } finally {
            setIsLoading(false);
        }
    };

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
                    {/* 헤더 영역 */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logo}>📔</Text>
                        </View>
                        <Text style={styles.title}>감성 일기</Text>
                        <Text style={styles.subtitle}>오늘 하루를 기록하세요</Text>
                    </View>

                    {/* 폼 카드 */}
                    <View style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>아이디</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="사용자 이름을 입력하세요"
                                placeholderTextColor={Palette.neutral[400]}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>비밀번호</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="비밀번호를 입력하세요"
                                placeholderTextColor={Palette.neutral[400]}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                editable={!isLoading}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => router.push('/forgot-password' as any)}
                        >
                            <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[Palette.primary[400], Palette.primary[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.loginButtonGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.loginButtonText}>로그인</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>또는</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity style={styles.socialButton}>
                            <Text style={styles.socialButtonText}>🍎 Apple로 계속하기</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
                            <Text style={[styles.socialButtonText, styles.googleButtonText]}>G  Google로 계속하기</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 푸터 */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            계정이 없으신가요?{' '}
                            <Text
                                style={styles.signupLink}
                                onPress={() => router.push('/register' as any)}
                            >
                                회원가입
                            </Text>
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient >
        </>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        ...Shadows.lg,
    },
    logo: {
        fontSize: 50,
    },
    title: {
        fontSize: FontSize.xxxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
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
    input: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
        borderWidth: 1.5,
        borderColor: Palette.neutral[200],
    },
    loginButton: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Palette.neutral[200],
    },
    dividerText: {
        color: Palette.neutral[500],
        paddingHorizontal: Spacing.md,
        fontSize: FontSize.sm,
    },
    socialButton: {
        backgroundColor: Palette.neutral[900],
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    googleButton: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: Palette.neutral[300],
    },
    socialButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: '#fff',
    },
    googleButtonText: {
        color: Palette.neutral[800],
    },
    footer: {
        alignItems: 'center',
        marginTop: Spacing.xxl,
    },
    footerText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
    },
    signupLink: {
        color: Palette.primary[500],
        fontWeight: FontWeight.bold,
    },
    forgotPassword: {
        alignItems: 'flex-end',
        marginBottom: Spacing.md,
    },
    forgotPasswordText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
    },
});
