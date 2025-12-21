import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Diary } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface DiaryCardProps {
    diary: Diary;
    onDelete?: () => void;
}

export const DiaryCard: React.FC<DiaryCardProps> = ({ diary, onDelete }) => {
    const router = useRouter();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return `${minutes}분 전`;
            }
            return `${hours}시간 전`;
        } else if (days === 1) {
            return '어제';
        } else if (days < 7) {
            return `${days}일 전`;
        }

        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
        });
    };

    const truncateContent = (content: string, maxLength: number = 120) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    const hasImage = diary.images && diary.images.length > 0;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/diary/${diary.id}` as any)}
            activeOpacity={0.9}
        >
            {/* 헤더 */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>📔</Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.title} numberOfLines={1}>
                        {diary.title || '제목 없음'}
                    </Text>
                    <Text style={styles.date}>{formatDate(diary.created_at)}</Text>
                </View>
                <TouchableOpacity
                    onPress={onDelete}
                    style={styles.menuButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <IconSymbol name="ellipsis" size={18} color={Palette.neutral[400]} />
                </TouchableOpacity>
            </View>

            {/* 내용 */}
            <Text style={styles.content}>{truncateContent(diary.content)}</Text>

            {/* 이미지 프리뷰 */}
            {hasImage && (
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: diary.images[0].image_url }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    {diary.images.length > 1 && (
                        <View style={styles.imageCount}>
                            <Text style={styles.imageCountText}>+{diary.images.length - 1}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* 푸터 */}
            <View style={styles.footer}>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <IconSymbol name="heart" size={18} color={Palette.neutral[400]} />
                        <Text style={styles.actionText}>좋아요</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/diary/edit/${diary.id}` as any)}
                    >
                        <IconSymbol name="pencil" size={18} color={Palette.neutral[400]} />
                        <Text style={styles.actionText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <IconSymbol name="sparkles" size={18} color={Palette.secondary[400]} />
                        <Text style={[styles.actionText, styles.aiText]}>AI 이미지</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Palette.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    avatarEmoji: {
        fontSize: 22,
    },
    headerInfo: {
        flex: 1,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[900],
        marginBottom: 2,
    },
    date: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
    },
    menuButton: {
        padding: Spacing.xs,
    },
    content: {
        fontSize: FontSize.md,
        color: Palette.neutral[700],
        lineHeight: 24,
        marginBottom: Spacing.md,
    },
    imageContainer: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 200,
        backgroundColor: Palette.neutral[100],
    },
    imageCount: {
        position: 'absolute',
        right: Spacing.sm,
        bottom: Spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    imageCountText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: Palette.neutral[100],
        paddingTop: Spacing.md,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
    },
    actionText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
    },
    aiText: {
        color: Palette.secondary[500],
    },
});

export default DiaryCard;
