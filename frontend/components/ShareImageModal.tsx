import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Share,
    Platform,
    Alert,
    ActivityIndicator,
    Switch,
    ScrollView,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ShareImageModalProps {
    visible: boolean;
    imageUrl: string;
    diaryTitle?: string;
    emotion?: string;
    onClose: () => void;
}

// 공유 템플릿 타입
type TemplateType = 'simple' | 'story' | 'quote';

const TEMPLATES: Record<TemplateType, { name: string; emoji: string; style: string }> = {
    simple: { name: '심플', emoji: '📷', style: 'minimal' },
    story: { name: '스토리', emoji: '📱', style: 'instagram' },
    quote: { name: '명언', emoji: '✨', style: 'quote' },
};

const EMOTION_EMOJIS: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😡',
    anxious: '😰',
    peaceful: '😌',
    excited: '🥳',
    tired: '😴',
    love: '🥰',
};

export function ShareImageModal({
    visible,
    imageUrl,
    diaryTitle,
    emotion,
    onClose,
}: ShareImageModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showWatermark, setShowWatermark] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('simple');

    const emotionEmoji = emotion ? EMOTION_EMOJIS[emotion] || '📝' : '📝';

    const handleShareImage = async () => {
        setIsSharing(true);
        try {
            const shareMessage = selectedTemplate === 'quote'
                ? `"${diaryTitle || '오늘의 일기'}" ${emotionEmoji}\n\n#감성일기 #AI아트`
                : `${emotionEmoji} ${diaryTitle || '오늘의 일기'}\n\n#감성일기 #AI아트`;

            if (Platform.OS === 'web') {
                await Share.share({
                    title: diaryTitle || '감성 일기 AI 이미지',
                    url: imageUrl,
                    message: shareMessage,
                });
            } else {
                const fileUri = ((FileSystem as any).cacheDirectory || '') + 'shared_image.png';
                await FileSystem.downloadAsync(imageUrl, fileUri);

                await Share.share({
                    title: diaryTitle || '감성 일기 AI 이미지',
                    url: fileUri,
                    message: shareMessage,
                });
            }
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('오류', '이미지 공유에 실패했습니다.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleSaveToGallery = async () => {
        setIsSaving(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('권한 필요', '갤러리에 저장하려면 미디어 라이브러리 접근 권한이 필요합니다.');
                return;
            }

            const fileUri = ((FileSystem as any).cacheDirectory || '') + 'ai_diary_image.png';
            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

            await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
            Alert.alert('저장 완료', '이미지가 갤러리에 저장되었습니다.');
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('오류', '이미지 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <Text style={styles.title}>🎨 이미지 공유</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <IconSymbol name="xmark" size={24} color={Palette.neutral[600]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* 이미지 미리보기 */}
                        <View style={[
                            styles.imageContainer,
                            selectedTemplate === 'story' && styles.imageContainerStory,
                        ]}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={[
                                    styles.image,
                                    selectedTemplate === 'story' && styles.imageStory,
                                ]}
                                resizeMode="cover"
                            />

                            {/* 감정 이모지 오버레이 */}
                            {selectedTemplate !== 'simple' && (
                                <View style={styles.emojiOverlay}>
                                    <Text style={styles.emojiLarge}>{emotionEmoji}</Text>
                                </View>
                            )}

                            {/* 워터마크 */}
                            {showWatermark && (
                                <View style={styles.watermark}>
                                    <Text style={styles.watermarkText}>✨ 감성일기</Text>
                                </View>
                            )}

                            {/* 인용구 스타일 */}
                            {selectedTemplate === 'quote' && diaryTitle && (
                                <View style={styles.quoteOverlay}>
                                    <Text style={styles.quoteText}>"{diaryTitle}"</Text>
                                </View>
                            )}
                        </View>

                        {/* 템플릿 선택 */}
                        <View style={styles.templateSection}>
                            <Text style={styles.sectionLabel}>템플릿 선택</Text>
                            <View style={styles.templateButtons}>
                                {(Object.keys(TEMPLATES) as TemplateType[]).map((key) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.templateButton,
                                            selectedTemplate === key && styles.templateButtonActive,
                                        ]}
                                        onPress={() => setSelectedTemplate(key)}
                                    >
                                        <Text style={styles.templateEmoji}>{TEMPLATES[key].emoji}</Text>
                                        <Text style={[
                                            styles.templateName,
                                            selectedTemplate === key && styles.templateNameActive,
                                        ]}>
                                            {TEMPLATES[key].name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* 워터마크 토글 */}
                        <View style={styles.optionRow}>
                            <Text style={styles.optionLabel}>워터마크 표시</Text>
                            <Switch
                                value={showWatermark}
                                onValueChange={setShowWatermark}
                                trackColor={{ false: Palette.neutral[200], true: Palette.primary[300] }}
                                thumbColor={showWatermark ? Palette.primary[500] : Palette.neutral[400]}
                            />
                        </View>
                    </ScrollView>

                    {/* 액션 버튼 */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={handleSaveToGallery}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <IconSymbol name="arrow.down.to.line" size={20} color="#fff" />
                            )}
                            <Text style={styles.actionButtonText}>
                                {isSaving ? '저장 중...' : '저장'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.shareButton]}
                            onPress={handleShareImage}
                            disabled={isSharing}
                        >
                            {isSharing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
                            )}
                            <Text style={styles.actionButtonText}>
                                {isSharing ? '공유 중...' : '공유하기'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
        overflow: 'hidden',
        ...Shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
    },
    closeButton: {
        padding: Spacing.xs,
    },
    imageContainer: {
        backgroundColor: Palette.neutral[900],
        padding: Spacing.sm,
        position: 'relative',
    },
    imageContainerStory: {
        aspectRatio: 9 / 16,
        padding: 0,
    },
    image: {
        width: '100%',
        height: 280,
        borderRadius: BorderRadius.md,
    },
    imageStory: {
        height: '100%',
        borderRadius: 0,
    },
    emojiOverlay: {
        position: 'absolute',
        top: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 50,
        padding: Spacing.sm,
    },
    emojiLarge: {
        fontSize: 32,
    },
    watermark: {
        position: 'absolute',
        bottom: Spacing.md,
        right: Spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    watermarkText: {
        color: '#fff',
        fontSize: FontSize.xs,
        fontWeight: '500',
    },
    quoteOverlay: {
        position: 'absolute',
        bottom: 60,
        left: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    quoteText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    templateSection: {
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    sectionLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        marginBottom: Spacing.sm,
    },
    templateButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    templateButton: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.neutral[100],
        borderWidth: 2,
        borderColor: 'transparent',
    },
    templateButtonActive: {
        borderColor: Palette.primary[500],
        backgroundColor: Palette.primary[50],
    },
    templateEmoji: {
        fontSize: 24,
        marginBottom: Spacing.xs,
    },
    templateName: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    templateNameActive: {
        color: Palette.primary[600],
        fontWeight: FontWeight.semibold,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    optionLabel: {
        fontSize: FontSize.md,
        color: Palette.neutral[700],
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        padding: Spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
    },
    saveButton: {
        backgroundColor: Palette.neutral[700],
    },
    shareButton: {
        backgroundColor: Palette.primary[500],
    },
    actionButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
});

export default ShareImageModal;
