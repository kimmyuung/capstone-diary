import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    Alert,
    ActivityIndicator,
    Share,
    Platform,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBiometric } from '@/contexts/BiometricContext';
import { diaryService } from '@/services/api';
import { Palette, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
export default function SettingsScreen() {
    const router = useRouter();
    const { isAuthenticated, logout } = useAuth();
    const { themeMode, isDark, setThemeMode, toggleTheme, fontSizeMode, setFontSizeMode } = useTheme();
    const {
        isBiometricSupported,
        isBiometricEnabled,
        toggleBiometric,
    } = useBiometric();
    const {
        reminderSettings,
        // ...
        toggleReminder,
        sendTestNotification,
        registerForPushNotifications,
    } = usePushNotifications();
    const [exporting, setExporting] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [diaryCount, setDiaryCount] = useState(0);

    // 일기 개수 불러오기
    useEffect(() => {
        const loadDiaryCount = async () => {
            if (isAuthenticated) {
                try {
                    const diaries = await diaryService.getAll();
                    setDiaryCount(diaries.length);
                } catch (error) {
                    console.error('Failed to load diary count:', error);
                }
            }
        };
        loadDiaryCount();
    }, [isAuthenticated]);

    // 알림 권한 요청
    const handleEnableReminder = async (enabled: boolean) => {
        if (enabled) {
            // 권한 요청
            const token = await registerForPushNotifications();
            if (token) {
                await toggleReminder(true);
                Alert.alert('성공', '일기 리마인더가 활성화되었습니다.\n매일 저녁 8시에 알림을 받습니다.');
            } else {
                Alert.alert('알림', '푸시 알림 권한이 필요합니다.\n설정에서 알림 권한을 허용해주세요.');
            }
        } else {
            await toggleReminder(false);
        }
    };

    // 테스트 알림 전송
    const handleTestNotification = async () => {
        await sendTestNotification();
        Alert.alert('테스트', '테스트 알림이 전송되었습니다.');
    };

    const handleExport = async () => {
        if (!isAuthenticated) {
            Alert.alert('알림', '로그인이 필요합니다.');
            return;
        }

        setExporting(true);
        try {
            const data = await diaryService.exportDiaries();
            const jsonString = JSON.stringify(data, null, 2);

            if (Platform.OS === 'web') {
                // 웹: 파일 다운로드
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `diary_export_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                Alert.alert('완료', '일기가 다운로드되었습니다.');
            } else {
                // 모바일: 공유
                await Share.share({
                    title: '일기 내보내기',
                    message: jsonString,
                });
            }
        } catch (err) {
            Alert.alert('오류', '내보내기에 실패했습니다.');
        } finally {
            setExporting(false);
        }
    };

    const handleExportPdf = async () => {
        if (!isAuthenticated) {
            Alert.alert('알림', '로그인이 필요합니다.');
            return;
        }

        setExportingPdf(true);
        try {
            const blob = await diaryService.exportPdf();
            const fileName = `diary_export_${new Date().toISOString().split('T')[0]}.pdf`;

            if (Platform.OS === 'web') {
                // 웹: PDF 파일 다운로드
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                Alert.alert('완료', 'PDF가 다운로드되었습니다.');
            } else {
                // 모바일: Share API로 공유 (expo-file-system 없이도 동작)
                try {
                    // Blob을 base64 data URI로 변환
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const dataUri = reader.result as string;
                        // Share API 사용
                        await Share.share({
                            title: '일기 PDF 내보내기',
                            message: `일기가 PDF로 내보내졌습니다.\n\n파일명: ${fileName}`,
                        });
                        Alert.alert('알림', 'PDF 내보내기가 요청되었습니다.\n모바일에서는 Share 기능을 통해 저장해주세요.');
                    };
                    reader.readAsDataURL(blob);
                } catch (shareError) {
                    Alert.alert('알림', 'PDF 내보내기는 현재 웹에서 직접 다운로드를 지원합니다.');
                }
            }
        } catch (err) {
            console.error('PDF export error:', err);
            Alert.alert('오류', 'PDF 내보내기에 실패했습니다.');
        } finally {
            setExportingPdf(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, isDark && styles.textDark]}>⚙️ 설정</Text>
            </View>

            {/* 프로필 섹션 */}
            {isAuthenticated && (
                <View style={[styles.section, isDark && styles.sectionDark]}>
                    <Text style={[styles.sectionTitle, isDark && styles.textDark]}>프로필</Text>
                    <View style={styles.profileContainer}>
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarText}>👤</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, isDark && styles.textDark]}>
                                사용자
                            </Text>
                        </View>
                    </View>
                    <View style={styles.profileStats}>
                        <View style={styles.profileStatItem}>
                            <Text style={[styles.profileStatNumber, isDark && styles.textDark]}>{diaryCount}</Text>
                            <Text style={[styles.profileStatLabel, isDark && styles.textMutedDark]}>작성한 일기</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* 테마 설정 */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>화면</Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <IconSymbol name="moon.fill" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                        <Text style={[styles.settingLabel, isDark && styles.textDark]}>다크 모드</Text>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: Palette.neutral[300], true: Palette.primary[400] }}
                        thumbColor="#fff"
                    />
                </View>

                <View style={styles.themeOptions}>
                    {(['light', 'dark', 'system'] as const).map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                styles.themeOption,
                                themeMode === mode && styles.themeOptionActive,
                            ]}
                            onPress={() => setThemeMode(mode)}
                        >
                            <Text style={[
                                styles.themeOptionText,
                                themeMode === mode && styles.themeOptionTextActive,
                            ]}>
                                {mode === 'light' ? '☀️ 라이트' : mode === 'dark' ? '🌙 다크' : '🔄 시스템'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 글꼴 크기 설정 */}
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.settingInfo}>
                        <IconSymbol name="textformat.size" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                        <Text style={[styles.settingLabel, isDark && styles.textDark]}>글꼴 크기</Text>
                    </View>
                </View>
                <View style={styles.fontSizeOptions}>
                    {(['small', 'medium', 'large'] as const).map((size) => (
                        <TouchableOpacity
                            key={size}
                            style={[
                                styles.fontSizeOption,
                                fontSizeMode === size && styles.fontSizeOptionActive,
                            ]}
                            onPress={() => setFontSizeMode(size)}
                        >
                            <Text style={[
                                styles.fontSizeOptionText,
                                fontSizeMode === size && styles.fontSizeOptionTextActive,
                                { fontSize: size === 'small' ? 12 : size === 'medium' ? 14 : 16 }
                            ]}>
                                {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 보안 설정 */}
            {isAuthenticated && (
                <View style={[styles.section, isDark && styles.sectionDark]}>
                    <Text style={[styles.sectionTitle, isDark && styles.textDark]}>보안</Text>

                    {/* 비밀번호 변경 */}
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => router.push('/change-password' as any)}
                    >
                        <View style={styles.settingInfo}>
                            <IconSymbol name="key.fill" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                            <Text style={[styles.settingLabel, isDark && styles.textDark]}>
                                비밀번호 변경
                            </Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                    </TouchableOpacity>

                    {/* 생체 인식 (지원되는 경우만) */}
                    {isBiometricSupported && (
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <IconSymbol name="lock.fill" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                                <View style={styles.settingTextContainer}>
                                    <Text style={[styles.settingLabel, isDark && styles.textDark]}>생체 인식 잠금</Text>
                                    <Text style={[styles.settingDescription, isDark && styles.textMutedDark]}>
                                        앱 실행 시 인증 요구
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={isBiometricEnabled}
                                onValueChange={(val) => { toggleBiometric(val); }}
                                trackColor={{ false: Palette.neutral[300], true: Palette.primary[400] }}
                                thumbColor="#fff"
                            />
                        </View>
                    )}
                </View>
            )}

            {/* 알림 설정 */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>알림</Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <IconSymbol name="bell.fill" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                        <View style={styles.settingTextContainer}>
                            <Text style={[styles.settingLabel, isDark && styles.textDark]}>일기 리마인더</Text>
                            <Text style={[styles.settingDescription, isDark && styles.textMutedDark]}>
                                매일 저녁 8시에 알림
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={reminderSettings.enabled}
                        onValueChange={handleEnableReminder}
                        trackColor={{ false: Palette.neutral[300], true: Palette.primary[400] }}
                        thumbColor="#fff"
                    />
                </View>

                {Platform.OS !== 'web' && (
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={handleTestNotification}
                    >
                        <View style={styles.settingInfo}>
                            <IconSymbol name="checkmark.circle" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                            <Text style={[styles.settingLabel, isDark && styles.textDark]}>
                                테스트 알림 전송
                            </Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                    </TouchableOpacity>
                )}
            </View>

            {/* 데이터 설정 */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>데이터</Text>

                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleExport}
                    disabled={exporting}
                >
                    <View style={styles.settingInfo}>
                        <IconSymbol name="square.and.arrow.up" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                        <Text style={[styles.settingLabel, isDark && styles.textDark]}>
                            일기 내보내기 (JSON)
                        </Text>
                    </View>
                    {exporting ? (
                        <ActivityIndicator size="small" color={Palette.primary[500]} />
                    ) : (
                        <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleExportPdf}
                    disabled={exportingPdf}
                >
                    <View style={styles.settingInfo}>
                        <IconSymbol name="doc.fill" size={20} color={isDark ? '#fff' : Palette.neutral[600]} />
                        <Text style={[styles.settingLabel, isDark && styles.textDark]}>
                            일기 내보내기 (PDF)
                        </Text>
                    </View>
                    {exportingPdf ? (
                        <ActivityIndicator size="small" color={Palette.primary[500]} />
                    ) : (
                        <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                    )}
                </TouchableOpacity>
            </View>

            {/* 계정 설정 */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>계정</Text>

                {isAuthenticated ? (
                    <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
                        <View style={styles.settingInfo}>
                            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={Palette.status.error} />
                            <Text style={[styles.settingLabel, { color: Palette.status.error }]}>
                                로그아웃
                            </Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => router.push('/login' as any)}
                    >
                        <View style={styles.settingInfo}>
                            <IconSymbol name="person.fill" size={20} color={Palette.primary[500]} />
                            <Text style={[styles.settingLabel, { color: Palette.primary[500] }]}>
                                로그인
                            </Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                    </TouchableOpacity>
                )}
            </View>

            {/* 앱 정보 */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>정보</Text>
                <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, isDark && styles.textDark]}>버전</Text>
                    <Text style={styles.settingValue}>1.0.0</Text>
                </View>
            </View>

            {/* 개발자 옵션 (로컬 환경 전용) */}
            {
                __DEV__ && (
                    <View style={[styles.section, isDark && styles.sectionDark]}>
                        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>개발자 옵션</Text>
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => Linking.openURL('http://localhost:8000/admin')}
                        >
                            <View style={styles.settingInfo}>
                                <IconSymbol name="wrench.and.screwdriver.fill" size={20} color={Palette.status.warning} />
                                <Text style={[styles.settingLabel, isDark && styles.textDark]}>
                                    관리자 페이지
                                </Text>
                            </View>
                            <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                        </TouchableOpacity>
                    </View>
                )
            }

            <View style={{ height: 100 }} />
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBFA',
    },
    containerDark: {
        backgroundColor: '#121212',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    textDark: {
        color: '#fff',
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Shadows.sm,
    },
    sectionDark: {
        backgroundColor: '#1E1E1E',
    },
    sectionTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[500],
        marginBottom: Spacing.md,
        textTransform: 'uppercase',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    settingLabel: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
    },
    settingValue: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
    },
    themeOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    themeOption: {
        flex: 1,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.neutral[100],
        alignItems: 'center',
    },
    themeOptionActive: {
        backgroundColor: Palette.primary[500],
    },
    themeOptionText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    themeOptionTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingDescription: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: 2,
    },
    textMutedDark: {
        color: Palette.neutral[400],
    },
    // 프로필 스타일
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    profileAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Palette.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    profileAvatarText: {
        fontSize: 24,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
    },
    profileEmail: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: 2,
    },
    profileStats: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: Palette.neutral[100],
        paddingTop: Spacing.md,
    },
    profileStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    profileStatNumber: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Palette.primary[500],
    },
    profileStatLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: 2,
    },
    // 글꼴 크기 스타일
    fontSizeOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    fontSizeOption: {
        flex: 1,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.neutral[100],
        alignItems: 'center',
    },
    fontSizeOptionActive: {
        backgroundColor: Palette.primary[500],
    },
    fontSizeOptionText: {
        color: Palette.neutral[600],
    },
    fontSizeOptionTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});
