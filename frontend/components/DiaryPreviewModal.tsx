import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DiaryPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    diary: {
        id: number;
        title: string;
        content: string;
        emotion: string;
        emotion_score?: number;
        created_at: string;
    } | null;
}

const EMOTION_MAP: { [key: string]: { emoji: string; label: string } } = {
    happy: { emoji: '😊', label: '행복' },
    sad: { emoji: '😢', label: '슬픔' },
    angry: { emoji: '😡', label: '화남' },
    anxious: { emoji: '😰', label: '불안' },
    peaceful: { emoji: '😌', label: '평온' },
    excited: { emoji: '🥳', label: '신남' },
    tired: { emoji: '😴', label: '피곤' },
    love: { emoji: '🥰', label: '사랑' },
};

export const DiaryPreviewModal: React.FC<DiaryPreviewModalProps> = ({
    visible,
    onClose,
    diary,
}) => {
    const router = useRouter();
    const { isDark } = useTheme();

    if (!diary) return null;

    const emotionInfo = EMOTION_MAP[diary.emotion] || { emoji: '📝', label: '기록' };
    const previewContent = diary.content.length > 150
        ? diary.content.substring(0, 150) + '...'
        : diary.content;

    const handleViewDetail = () => {
        onClose();
        router.push(`/diary/${diary.id}` as any);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.container, isDark && styles.containerDark]}>
                    {/* 헤더 - 감정 + 날짜 */}
                    <View style={styles.header}>
                        <View style={styles.emotionBadge}>
                            <Text style={styles.emotionEmoji}>{emotionInfo.emoji}</Text>
                            <Text style={[styles.emotionLabel, isDark && styles.textLight]}>
                                {emotionInfo.label}
                            </Text>
                        </View>
                        <Text style={[styles.date, isDark && styles.textMuted]}>
                            {diary.created_at}
                        </Text>
                    </View>

                    {/* 제목 */}
                    <Text style={[styles.title, isDark && styles.textLight]} numberOfLines={2}>
                        {diary.title}
                    </Text>

                    {/* 내용 미리보기 */}
                    <Text style={[styles.content, isDark && styles.textMuted]} numberOfLines={4}>
                        {previewContent}
                    </Text>

                    {/* 버튼 */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={[styles.closeButtonText, isDark && styles.textMuted]}>닫기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.viewButton} onPress={handleViewDetail}>
                            <Text style={styles.viewButtonText}>자세히 보기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    container: {
        width: SCREEN_WIDTH - Spacing.xl * 2,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxWidth: 400,
    },
    containerDark: {
        backgroundColor: '#1e1e1e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emotionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    emotionEmoji: {
        fontSize: 16,
    },
    emotionLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
    },
    date: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
        marginBottom: Spacing.sm,
    },
    content: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    textLight: {
        color: '#fff',
    },
    textMuted: {
        color: '#888',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    closeButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.neutral[100],
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        fontWeight: FontWeight.semibold,
    },
    viewButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.primary[500],
        alignItems: 'center',
    },
    viewButtonText: {
        fontSize: FontSize.md,
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});

export default DiaryPreviewModal;
