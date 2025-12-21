import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Platform,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { diaryService } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface LocationDiary {
    id: number;
    title: string;
    location_name: string;
    latitude: number;
    longitude: number;
    emotion: string | null;
    emotion_emoji: string;
    created_at: string;
}

export default function PlacesScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [locations, setLocations] = useState<LocationDiary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState<LocationDiary | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchLocations();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchLocations = async () => {
        try {
            const data = await diaryService.getLocations();
            setLocations(data.locations);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        } finally {
            setLoading(false);
        }
    };

    const openInMaps = (lat: number, lng: number, name: string) => {
        const scheme = Platform.select({
            ios: `maps:0,0?q=${name}@${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${name})`,
            web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        });

        if (scheme) {
            Linking.openURL(scheme);
        }
    };

    // 위치별로 그룹화
    const groupedLocations = locations.reduce((acc, diary) => {
        const key = diary.location_name || '기타';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(diary);
        return acc;
    }, {} as Record<string, LocationDiary[]>);

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📍</Text>
                    <Text style={styles.emptyTitle}>로그인이 필요합니다</Text>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => router.push('/login' as any)}
                    >
                        <Text style={styles.loginButtonText}>로그인하기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Palette.primary[500]} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📍 장소별 일기</Text>
                <Text style={styles.headerSubtitle}>
                    {locations.length}개의 위치 기록
                </Text>
            </View>

            {locations.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🗺️</Text>
                    <Text style={styles.emptyTitle}>아직 위치 기록이 없어요</Text>
                    <Text style={styles.emptyText}>
                        일기 작성 시 장소를 선택하면{'\n'}여기서 위치별로 일기를 볼 수 있어요
                    </Text>
                </View>
            ) : (
                <>
                    {/* 지도 미리보기 (웹뷰 대체) */}
                    <View style={styles.mapPreview}>
                        <View style={styles.mapPlaceholder}>
                            <Text style={styles.mapPlaceholderEmoji}>🗺️</Text>
                            <Text style={styles.mapPlaceholderText}>
                                지도에서 {locations.length}개의 장소 확인
                            </Text>
                            {locations[0] && (
                                <TouchableOpacity
                                    style={styles.openMapButton}
                                    onPress={() => openInMaps(
                                        locations[0].latitude,
                                        locations[0].longitude,
                                        locations[0].location_name
                                    )}
                                >
                                    <IconSymbol name="map.fill" size={16} color="#fff" />
                                    <Text style={styles.openMapButtonText}>지도 앱에서 열기</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* 위치별 그룹 목록 */}
                    {Object.entries(groupedLocations).map(([locationName, diaries]) => (
                        <View key={locationName} style={styles.locationGroup}>
                            <View style={styles.locationHeader}>
                                <Text style={styles.locationName}>📍 {locationName}</Text>
                                <Text style={styles.locationCount}>{diaries.length}개</Text>
                            </View>

                            {diaries.map((diary) => (
                                <TouchableOpacity
                                    key={diary.id}
                                    style={styles.diaryItem}
                                    onPress={() => router.push(`/diary/${diary.id}` as any)}
                                >
                                    <Text style={styles.diaryEmoji}>{diary.emotion_emoji || '📝'}</Text>
                                    <View style={styles.diaryInfo}>
                                        <Text style={styles.diaryTitle} numberOfLines={1}>
                                            {diary.title}
                                        </Text>
                                        <Text style={styles.diaryDate}>{diary.created_at}</Text>
                                    </View>
                                    <IconSymbol name="chevron.right" size={16} color={Palette.neutral[400]} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFBFA',
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
    headerSubtitle: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: Spacing.xs,
    },
    mapPreview: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.md,
    },
    mapPlaceholder: {
        height: 180,
        backgroundColor: Palette.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPlaceholderEmoji: {
        fontSize: 48,
        marginBottom: Spacing.sm,
    },
    mapPlaceholderText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        marginBottom: Spacing.md,
    },
    openMapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        gap: Spacing.xs,
    },
    openMapButtonText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
        fontSize: FontSize.sm,
    },
    locationGroup: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Palette.neutral[50],
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    locationName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
    },
    locationCount: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
    },
    diaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    diaryEmoji: {
        fontSize: 24,
        marginRight: Spacing.md,
    },
    diaryInfo: {
        flex: 1,
    },
    diaryTitle: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
    },
    diaryDate: {
        fontSize: FontSize.xs,
        color: Palette.neutral[400],
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
        textAlign: 'center',
        lineHeight: 24,
    },
    loginButton: {
        marginTop: Spacing.lg,
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});
