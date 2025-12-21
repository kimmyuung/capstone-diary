import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Dimensions,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { diaryService } from '@/services/api';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

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
}

export default function GalleryScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Palette.primary[500]} />
            </View>
        );
    }

    const renderItem = ({ item }: { item: GalleryImage }) => (
        <TouchableOpacity
            style={styles.imageItem}
            onPress={() => setSelectedImage(item)}
            activeOpacity={0.8}
        >
            <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🖼️ 이미지 갤러리</Text>
                <Text style={styles.headerSubtitle}>{images.length}개의 AI 생성 이미지</Text>
            </View>

            {images.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🎨</Text>
                    <Text style={styles.emptyTitle}>아직 생성된 이미지가 없어요</Text>
                    <Text style={styles.emptyText}>일기를 작성하고 AI 이미지를 생성해보세요!</Text>
                </View>
            ) : (
                <FlatList
                    data={images}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={3}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* 이미지 상세 모달 */}
            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setSelectedImage(null)}
                >
                    <View style={styles.modalContent}>
                        {selectedImage && (
                            <>
                                <Image
                                    source={{ uri: selectedImage.image_url }}
                                    style={styles.fullImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.imageInfo}>
                                    <Text style={styles.imageTitle}>{selectedImage.diary_title}</Text>
                                    <Text style={styles.imageDate}>{selectedImage.diary_date}</Text>
                                    <Text style={styles.imagePrompt} numberOfLines={3}>
                                        {selectedImage.ai_prompt}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.viewDiaryButton}
                                    onPress={() => {
                                        setSelectedImage(null);
                                        router.push(`/diary/${selectedImage.diary_id}` as any);
                                    }}
                                >
                                    <Text style={styles.viewDiaryButtonText}>일기 보기</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
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
    },
    headerSubtitle: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        marginTop: Spacing.xs,
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
});
