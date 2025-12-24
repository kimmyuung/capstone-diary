import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Diary } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface CalendarDiaryCardProps {
    diary: Diary;
    isToday: boolean;
    onEdit?: (id: number) => void;
    onDelete?: (id: number) => void;
}

export const CalendarDiaryCard: React.FC<CalendarDiaryCardProps> = ({
    diary,
    isToday,
    onEdit,
    onDelete,
}) => {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const hasImage = diary.images && diary.images.length > 0;
    const firstImage = hasImage ? diary.images[0] : null;

    const handlePress = () => {
        router.push(`/diary/${diary.id}` as any);
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(diary.id);
        } else {
            router.push(`/diary/edit/${diary.id}` as any);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            '일기 삭제',
            '정말로 이 일기를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => {
                        if (onDelete) {
                            onDelete(diary.id);
                        }
                    },
                },
            ]
        );
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            {/* 이미지 (첫 번째 이미지만) */}
            {firstImage && (
                <Image
                    source={{ uri: firstImage.image_url }}
                    style={styles.image}
                    resizeMode="cover"
                />
            )}

            {/* 콘텐츠 영역 */}
            <View style={styles.content}>
                {/* 제목 */}
                <View style={styles.titleRow}>
                    <Text style={styles.emoji}>
                        {diary.emotion_emoji || '📝'}
                    </Text>
                    <Text
                        style={[styles.title, { color: colors.text }]}
                        numberOfLines={1}
                    >
                        {diary.title || '제목 없음'}
                    </Text>
                </View>

                {/* 시간 */}
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                    {new Date(diary.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>

                {/* 액션 버튼 */}
                <View style={styles.actions}>
                    {isToday && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={handleEdit}
                        >
                            <IconSymbol name="pencil" size={14} color={Palette.primary[500]} />
                            <Text style={[styles.actionText, { color: Palette.primary[500] }]}>
                                수정
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDelete}
                    >
                        <IconSymbol name="trash" size={14} color={Palette.status.error} />
                        <Text style={[styles.actionText, { color: Palette.status.error }]}>
                            삭제
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    image: {
        width: 80,
        height: 80,
        backgroundColor: Palette.neutral[100],
    },
    content: {
        flex: 1,
        padding: Spacing.md,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    emoji: {
        fontSize: 18,
        marginRight: Spacing.xs,
    },
    title: {
        flex: 1,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    time: {
        fontSize: FontSize.xs,
        marginBottom: Spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    editButton: {
        backgroundColor: Palette.primary[50],
    },
    deleteButton: {
        backgroundColor: '#FEE2E2',
    },
    actionText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.medium,
    },
});

export default CalendarDiaryCard;
