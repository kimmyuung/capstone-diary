import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Dimensions,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { diaryService } from '@/services/api';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { ImageViewer } from '@/components/ImageViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3;

interface GalleryImage {
    id: number;
    image_url: string;
    ai_prompt: string;
    created_at: string;
    diary_id: number;
    diary_title: string;
    diary_date: string;
    emotion?: string;
}

const EMOTION_FILTERS = [
    { key: 'all', label: '전체', emoji: '🎨' },
    { key: 'happy', label: '행복', emoji: '😊' },
    { key: 'sad', label: '슬픔', emoji: '😢' },
    { key: 'angry', label: '화남', emoji: '😡' },
    { key: 'anxious', label: '불안', emoji: '😰' },
    { key: 'peaceful', label: '평온', emoji: '😌' },
    { key: 'excited', label: '신남', emoji: '🥳' },
    { key: 'tired', label: '피곤', emoji: '😴' },
    { key: 'love', label: '사랑', emoji: '🥰' },
];

export default function GalleryScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { colors, isDark } = useTheme();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    useEffect(() => {
        if (isAuthenticated) {
            fetchGallery();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchGallery = async () => {
        try {
            const data = await diaryService.getGallery();
            setImages(data.images);
        } catch (err) {
            console.error('Failed to fetch gallery:', err);
        } finally {
            setLoading(false);
        }
    };

    // 감정별 필터링
    const filteredImages = useMemo(() => {
        if (selectedFilter === 'all') return images;
        return images.filter(img => img.emotion === selectedFilter);
    }, [images, selectedFilter]);

    const openViewer = (index: number) => {
        setViewerIndex(index);
        setViewerVisible(true);
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🖼️</Text>
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
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Palette.primary[500]} />
            </View>
        );
    }

    const renderFilterChip = ({ key, label, emoji }: typeof EMOTION_FILTERS[0]) => {
        const isActive = selectedFilter === key;
        return (
            <TouchableOpacity
                key={key}
                style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                    isDark && !isActive && styles.filterChipDark,
                ]}
                onPress={() => setSelectedFilter(key)}
            >
                <Text style={styles.filterEmoji}>{emoji}</Text>
                <Text style={[
                    styles.filterLabel,
                    isActive && styles.filterLabelActive,
                    isDark && !isActive && styles.filterLabelDark,
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item, index }: { item: GalleryImage; index: number }) => (
        <TouchableOpacity
            style={styles.imageItem}
            onPress={() => openViewer(index)}
            activeOpacity={0.8}
        >
            <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
            {item.emotion && (
                <View style={styles.emotionBadge}>
                    <Text style={styles.emotionBadgeText}>
                        {EMOTION_FILTERS.find(e => e.key === item.emotion)?.emoji || ''}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>🖼️ 이미지 갤러리</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                    {filteredImages.length}개의 AI 생성 이미지
                </Text>
            </View>

            {/* 감정 필터 */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {EMOTION_FILTERS.map(renderFilterChip)}
            </ScrollView>

            {filteredImages.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🎨</Text>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {selectedFilter === 'all' ? '아직 생성된 이미지가 없어요' : '해당 감정의 이미지가 없어요'}
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {selectedFilter === 'all' ? '일기를 작성하고 AI 이미지를 생성해보세요!' : '다른 감정을 선택해보세요'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredImages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ImageViewer 모달 */}
            <ImageViewer
                visible={viewerVisible}
                images={filteredImages}
                initialIndex={viewerIndex}
                onClose={() => setViewerVisible(false)}
            />
        </View>
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
        flexShrink: 1,
    },
    headerSubtitle: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: Spacing.xs,
        flexShrink: 1,
    },
    gridContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },
    imageItem: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        margin: Spacing.xs,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        backgroundColor: Palette.neutral[100],
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: SCREEN_WIDTH - Spacing.xl * 2,
        maxHeight: '80%',
    },
    fullImage: {
        width: '100%',
        height: 300,
        borderRadius: BorderRadius.lg,
    },
    imageInfo: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginTop: Spacing.lg,
    },
    imageTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    imageDate: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.7)',
        marginTop: Spacing.xs,
    },
    imagePrompt: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.6)',
        marginTop: Spacing.md,
        fontStyle: 'italic',
    },
    viewDiaryButton: {
        backgroundColor: Palette.primary[500],
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    viewDiaryButtonText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    // 감정 필터 스타일
    filterContainer: {
        maxHeight: 50,
        marginBottom: Spacing.md,
    },
    filterContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    filterChipActive: {
        backgroundColor: Palette.primary[500],
    },
    filterChipDark: {
        backgroundColor: '#333',
    },
    filterEmoji: {
        fontSize: 14,
    },
    filterLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    filterLabelActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    filterLabelDark: {
        color: '#ccc',
    },
    // 감정 배지 스타일
    emotionBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emotionBadgeText: {
        fontSize: 12,
    },
});

