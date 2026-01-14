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
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ShareImageModalProps {
    visible: boolean;
    imageUrl: string;
    diaryTitle?: string;
    onClose: () => void;
}

export function ShareImageModal({
    visible,
    imageUrl,
    diaryTitle,
    onClose,
}: ShareImageModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const handleShareImage = async () => {
        setIsSharing(true);
        try {
            if (Platform.OS === 'web') {
                // 웹에서는 URL 공유
                await Share.share({
                    title: diaryTitle || '감성 일기 AI 이미지',
                    url: imageUrl,
                });
            } else {
                // 모바일에서는 이미지 파일 공유
                const fileUri = ((FileSystem as any).cacheDirectory || '') + 'shared_image.png';
                await FileSystem.downloadAsync(imageUrl, fileUri);

                await Share.share({
                    title: diaryTitle || '감성 일기 AI 이미지',
                    url: fileUri,
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
            // 권한 요청
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('권한 필요', '갤러리에 저장하려면 미디어 라이브러리 접근 권한이 필요합니다.');
                return;
            }

            // 이미지 다운로드
            const fileUri = ((FileSystem as any).cacheDirectory || '') + 'ai_diary_image.png';
            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

            // 갤러리에 저장
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
                        <Text style={styles.title}>🎨 AI 생성 이미지</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <IconSymbol name="xmark" size={24} color={Palette.neutral[600]} />
                        </TouchableOpacity>
                    </View>

                    {/* 이미지 미리보기 */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>

                    {/* 일기 제목 */}
                    {diaryTitle && (
                        <Text style={styles.diaryTitle} numberOfLines={1}>
                            "{diaryTitle}"
                        </Text>
                    )}

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
                                {isSaving ? '저장 중...' : '갤러리에 저장'}
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
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        width: '100%',
        maxWidth: 400,
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
        backgroundColor: Palette.neutral[100],
        padding: Spacing.md,
    },
    image: {
        width: '100%',
        height: 300,
        borderRadius: BorderRadius.md,
    },
    diaryTitle: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        textAlign: 'center',
        fontStyle: 'italic',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
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
