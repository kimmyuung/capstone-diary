import React, { useState, useRef } from 'react';
import {
    View,
    Modal,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Text,
    ActivityIndicator,
    Alert,
    Platform,
    Share,
} from 'react-native';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
    visible: boolean;
    images: Array<{
        id: number;
        image_url: string;
        ai_prompt?: string;
        diary_title?: string;
        diary_date?: string;
        emotion?: string;
    }>;
    initialIndex: number;
    onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
    visible,
    images,
    initialIndex = 0,
    onClose,
}) => {
    const { isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [loading, setLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Pinch zoom values
    const scale = useSharedValue(1);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const currentImage = images[currentIndex];

    // Reset zoom when changing images
    const resetZoom = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
    };

    const handlePinch = (event: any) => {
        scale.value = Math.max(1, Math.min(event.nativeEvent.scale, 4));
    };

    const handlePinchEnd = () => {
        if (scale.value < 1) {
            scale.value = withSpring(1);
        }
    };

    const handlePan = (event: any) => {
        if (scale.value > 1) {
            translateX.value = event.nativeEvent.translationX;
            translateY.value = event.nativeEvent.translationY;
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const goToNext = () => {
        if (currentIndex < images.length - 1) {
            resetZoom();
            setCurrentIndex(currentIndex + 1);
            setLoading(true);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            resetZoom();
            setCurrentIndex(currentIndex - 1);
            setLoading(true);
        }
    };

    const handleDownload = async () => {
        if (!currentImage?.image_url) return;

        try {
            setDownloading(true);

            if (Platform.OS === 'web') {
                // Web: Open in new tab
                window.open(currentImage.image_url, '_blank');
                Alert.alert('알림', '이미지가 새 탭에서 열렸습니다.');
            } else {
                // Mobile: Save to gallery
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('권한 필요', '이미지 저장을 위해 갤러리 접근 권한이 필요합니다.');
                    return;
                }

                const filename = `diary_${Date.now()}.jpg`;
                const fileUri = FileSystem.documentDirectory + filename;

                const downloadResult = await FileSystem.downloadAsync(
                    currentImage.image_url,
                    fileUri
                );

                await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
                Alert.alert('완료', '이미지가 갤러리에 저장되었습니다.');
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('오류', '이미지 저장에 실패했습니다.');
        } finally {
            setDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!currentImage?.image_url) return;

        try {
            await Share.share({
                message: currentImage.ai_prompt
                    ? `${currentImage.diary_title}\n\n${currentImage.ai_prompt}`
                    : currentImage.diary_title || '일기 이미지',
                url: currentImage.image_url,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    if (!visible || !currentImage) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={styles.container}>
                <View style={[styles.container, isDark && styles.containerDark]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <IconSymbol name="xmark" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {currentIndex + 1} / {images.length}
                        </Text>
                        <TouchableOpacity onPress={() => setShowInfo(!showInfo)} style={styles.headerButton}>
                            <IconSymbol name="info.circle" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Image */}
                    <PinchGestureHandler
                        onGestureEvent={handlePinch}
                        onEnded={handlePinchEnd}
                    >
                        <Animated.View style={styles.imageContainer}>
                            <PanGestureHandler onGestureEvent={handlePan}>
                                <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                                    {loading && (
                                        <ActivityIndicator
                                            size="large"
                                            color="#fff"
                                            style={styles.loader}
                                        />
                                    )}
                                    <Image
                                        source={{ uri: currentImage.image_url }}
                                        style={styles.image}
                                        resizeMode="contain"
                                        onLoadEnd={() => setLoading(false)}
                                    />
                                </Animated.View>
                            </PanGestureHandler>
                        </Animated.View>
                    </PinchGestureHandler>

                    {/* Navigation Arrows */}
                    {currentIndex > 0 && (
                        <TouchableOpacity style={[styles.navButton, styles.navLeft]} onPress={goToPrevious}>
                            <IconSymbol name="chevron.left" size={32} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {currentIndex < images.length - 1 && (
                        <TouchableOpacity style={[styles.navButton, styles.navRight]} onPress={goToNext}>
                            <IconSymbol name="chevron.right" size={32} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {/* Info Panel */}
                    {showInfo && (
                        <View style={styles.infoPanel}>
                            <Text style={styles.infoTitle}>{currentImage.diary_title}</Text>
                            <Text style={styles.infoDate}>{currentImage.diary_date}</Text>
                            {currentImage.ai_prompt && (
                                <Text style={styles.infoPrompt}>{currentImage.ai_prompt}</Text>
                            )}
                        </View>
                    )}

                    {/* Bottom Actions */}
                    <View style={styles.bottomActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleDownload}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <IconSymbol name="arrow.down.circle" size={28} color="#fff" />
                            )}
                            <Text style={styles.actionText}>저장</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                            <IconSymbol name="square.and.arrow.up" size={28} color="#fff" />
                            <Text style={styles.actionText}>공유</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    containerDark: {
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    loader: {
        position: 'absolute',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        padding: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 30,
    },
    navLeft: {
        left: 8,
    },
    navRight: {
        right: 8,
    },
    infoPanel: {
        position: 'absolute',
        bottom: 120,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        padding: 16,
    },
    infoTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    infoDate: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 8,
    },
    infoPrompt: {
        color: '#ddd',
        fontSize: 14,
        lineHeight: 20,
    },
    bottomActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        paddingBottom: 40,
    },
    actionButton: {
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
    },
});

export default ImageViewer;
