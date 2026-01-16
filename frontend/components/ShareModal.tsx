import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Share,
    Alert,
    ActivityIndicator,
    Clipboard,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

interface ShareModalProps {
    visible: boolean;
    onClose: () => void;
    diaryId: number;
    diaryTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    visible,
    onClose,
    diaryId,
    diaryTitle,
}) => {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [shareToken, setShareToken] = useState<string | null>(null);

    const handleCreateLink = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/api/diaries/${diaryId}/share/`);
            setShareToken(response.data.share_token);
            setShareUrl(`https://yourdomain.com${response.data.share_url}`);
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('오류', '공유 링크 생성에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (shareUrl) {
            Clipboard.setString(shareUrl);
            Alert.alert('복사됨', '링크가 클립보드에 복사되었습니다.');
        }
    };

    const handleShare = async () => {
        if (shareUrl) {
            try {
                await Share.share({
                    message: `${diaryTitle}\n\n${shareUrl}`,
                    url: shareUrl,
                });
            } catch (error) {
                console.error('Share error:', error);
            }
        }
    };

    const handleStopSharing = async () => {
        setLoading(true);
        try {
            await api.delete(`/api/diaries/${diaryId}/share/`);
            setShareUrl(null);
            setShareToken(null);
            Alert.alert('완료', '공유가 해제되었습니다.');
        } catch (error) {
            console.error('Stop sharing error:', error);
            Alert.alert('오류', '공유 해제에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShareUrl(null);
        setShareToken(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={handleClose}
            >
                <View style={[styles.container, isDark && styles.containerDark]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, isDark && styles.textLight]}>
                            일기 공유하기
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <IconSymbol name="xmark" size={20} color={isDark ? '#fff' : '#333'} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.diaryTitle, isDark && styles.textMuted]}>
                        "{diaryTitle}"
                    </Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Palette.primary[500]} />
                            <Text style={[styles.loadingText, isDark && styles.textMuted]}>
                                처리 중...
                            </Text>
                        </View>
                    ) : shareUrl ? (
                        <View style={styles.linkContainer}>
                            <View style={[styles.linkBox, isDark && styles.linkBoxDark]}>
                                <Text style={[styles.linkText, isDark && styles.textLight]} numberOfLines={2}>
                                    {shareUrl}
                                </Text>
                            </View>
                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                                    <IconSymbol name="doc.on.doc" size={18} color="#fff" />
                                    <Text style={styles.buttonText}>복사</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                                    <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                                    <Text style={styles.buttonText}>공유</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.stopButton} onPress={handleStopSharing}>
                                <Text style={styles.stopButtonText}>공유 해제</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.createContainer}>
                            <Text style={[styles.description, isDark && styles.textMuted]}>
                                이 일기를 다른 사람들과 공유하시겠습니까?{'\n'}
                                공개 링크가 생성되며, 링크를 아는 누구나 이 일기를 볼 수 있습니다.
                            </Text>
                            <TouchableOpacity style={styles.createButton} onPress={handleCreateLink}>
                                <IconSymbol name="link" size={18} color="#fff" />
                                <Text style={styles.createButtonText}>공유 링크 만들기</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
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
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#333',
    },
    textLight: {
        color: '#fff',
    },
    textMuted: {
        color: '#888',
    },
    diaryTitle: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        marginBottom: Spacing.lg,
        fontStyle: 'italic',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Palette.neutral[500],
    },
    linkContainer: {
        gap: Spacing.md,
    },
    linkBox: {
        backgroundColor: Palette.neutral[100],
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    linkBoxDark: {
        backgroundColor: '#333',
    },
    linkText: {
        fontSize: FontSize.sm,
        color: Palette.primary[600],
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    copyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.neutral[600],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: 6,
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    stopButton: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    stopButtonText: {
        color: Palette.status.error,
        fontSize: FontSize.sm,
    },
    createContainer: {
        alignItems: 'center',
    },
    description: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.lg,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
        gap: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
});

export default ShareModal;
