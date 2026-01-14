import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { diaryService, Diary } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ReflectionCard from '@/components/ReflectionCard';
import VoiceRecorder from '@/components/VoiceRecorder';
import { DiaryDetailSkeleton } from '@/components/Skeleton';
import { FadeInView } from '@/components/animations/FadeInView';
import { useToast } from '@/contexts/ToastContext';
import { Shadows } from '@/constants/theme';

export default function DiaryDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const [diary, setDiary] = useState<Diary | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingImage, setGeneratingImage] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [similarDiaries, setSimilarDiaries] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            fetchDiary();
            fetchSimilarDiaries();
        }
    }, [id]);

    const fetchSimilarDiaries = async () => {
        try {
            const data = await diaryService.getSimilarDiaries(Number(id));
            setSimilarDiaries(data);
        } catch (err) {
            console.error('Failed to fetch similar diaries:', err);
        }
    };

    const fetchDiary = async () => {
        try {
            const data = await diaryService.getById(Number(id));
            setDiary(data);
        } catch (err) {
            console.error('Failed to fetch diary:', err);
            Alert.alert('오류', '일기를 불러오는데 실패했습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (updatedDiary: Diary) => {
        setDiary(updatedDiary);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Polling Logic
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;

        if (generatingImage && diary) {
            const initialImageCount = diary.images.length;
            const POLL_INTERVAL = 3000; // 3 seconds
            const TIMEOUT = 60000;      // 60 seconds timeout

            // Polling function
            const checkImageStatus = async () => {
                try {
                    const updatedDiary = await diaryService.getById(diary.id);
                    if (updatedDiary.images.length > initialImageCount) {
                        setDiary(updatedDiary);
                        setGeneratingImage(false);
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showToast('AI 이미지가 생성되었습니다!');
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            };

            intervalId = setInterval(checkImageStatus, POLL_INTERVAL);

            // Timeout handler
            timeoutId = setTimeout(() => {
                setGeneratingImage(false);
                clearInterval(intervalId);
                showToast('이미지 생성이 지연되고 있습니다. 나중에 다시 확인해주세요.', 'info');
            }, TIMEOUT);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [generatingImage]);

    const handleGenerateImage = async () => {
        if (!diary) return;

        // [최적화] 일기 내용이 너무 짧으면 이미지 생성을 제한합니다 (50자 기준)
        if (diary.content.length < 50) {
            Alert.alert(
                '알림',
                '일기 내용이 너무 짧습니다.\n더 풍성한 그림을 위해 50자 이상 작성해주세요!',
                [{ text: '확인' }]
            );
            return;
        }

        // 최대 3장 제한
        if (diary.images.length >= 3) {
            showToast('AI 이미지는 최대 3장까지 생성 가능합니다.', 'info');
            return;
        }

        setGeneratingImage(true);
        await Haptics.selectionAsync();

        try {
            const response = await diaryService.generateImage(diary.id);
            // 202 Accepted or 201 Created (Legacy/Fast)
            if (response.status === 'processing' || response.status === 202) {
                showToast('이미지 생성을 시작했습니다. 잠시만 기다려주세요...', 'info');
                // Polling effect will take over
            } else if (response.image_url) {
                // Synchronous fallback (rare)
                const newImage = response;
                setDiary({
                    ...diary,
                    images: [...diary.images, newImage],
                });
                setGeneratingImage(false);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('AI 이미지가 생성되었습니다!');
            }
        } catch (err) {
            console.error('Failed to generate image:', err);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast('이미지 생성 요청 실패', 'error');
            setGeneratingImage(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('일기 삭제', '정말로 이 일기를 삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            {
                text: '삭제',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await diaryService.delete(Number(id));
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showToast('일기가 삭제되었습니다');
                        router.back();
                    } catch (err) {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        showToast('삭제에 실패했습니다', 'error');
                    }
                },
            },
        ]);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        });
    };

    if (loading) {
        return <DiaryDetailSkeleton />;
    }

    if (!diary) {
        return (
            <View style={styles.loadingContainer}>
                <Text>일기를 찾을 수 없습니다</Text>
            </View>
        );
    }

    return (
        <FadeInView style={{ flex: 1 }}>
            <Stack.Screen
                options={{
                    title: '',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#333',
                    headerRight: () => (
                        <View style={styles.headerButtons}>
                            <TouchableOpacity
                                onPress={() => router.push(`/diary/edit/${id}` as any)}
                                style={styles.headerButton}
                            >
                                <IconSymbol name="pencil" size={20} color="#6C63FF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                                <IconSymbol name="trash" size={20} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{diary.title}</Text>
                    <Text style={styles.date}>{formatDate(diary.created_at)}</Text>
                    {/* 키워드 섹션 */}
                    {diary.keywords && diary.keywords.length > 0 && (
                        <View style={styles.keywordContainer}>
                            {diary.keywords.map((keyword, index) => (
                                <View key={index} style={styles.keywordBadge}>
                                    <Text style={styles.keywordText}>#{keyword}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <Text style={styles.content}>{diary.content}</Text>
                </View>

                {/* AI 회고 카드 (Feature 1) */}
                {diary.reflection_question && (
                    <View style={styles.sectionContainer}>
                        <ReflectionCard diary={diary} onUpdate={handleUpdate} />
                    </View>
                )}

                {/* 음성 녹음 (Feature 4) */}
                <View style={styles.sectionContainer}>
                    <VoiceRecorder
                        diaryId={diary.id}
                        existingVoiceUrl={diary.voice_file}
                        transcription={diary.transcription}
                        isTranscribing={diary.is_transcribing}
                        onUpdate={(url) => handleUpdate({ ...diary, voice_file: url })}
                    />
                </View>

                {/* 위치 정보 섹션 */}
                {diary.location_name && (
                    <View style={styles.locationSection}>
                        <Text style={styles.locationTitle}>📍 위치</Text>
                        <View style={styles.locationContent}>
                            <Text style={styles.locationName}>{diary.location_name}</Text>
                            {diary.latitude && diary.longitude && (
                                <TouchableOpacity
                                    style={styles.mapButton}
                                    onPress={() => {
                                        const scheme = Platform.select({
                                            ios: `maps:0,0?q=${diary.location_name}@${diary.latitude},${diary.longitude}`,
                                            android: `geo:0,0?q=${diary.latitude},${diary.longitude}(${diary.location_name})`,
                                            web: `https://www.google.com/maps/search/?api=1&query=${diary.latitude},${diary.longitude}`,
                                        });
                                        if (scheme) {
                                            Linking.openURL(scheme);
                                        }
                                    }}
                                >
                                    <IconSymbol name="map" size={16} color="#fff" />
                                    <Text style={styles.mapButtonText}>지도에서 보기</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* AI 이미지 섹션 */}
                <View style={styles.imageSection}>
                    <View style={styles.imageSectionHeader}>
                        <Text style={styles.imageSectionTitle}>
                            🎨 AI 생성 이미지 ({diary.images.length}/3)
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.generateButton,
                                (generatingImage || diary.images.length >= 3) && styles.generateButtonDisabled
                            ]}
                            onPress={handleGenerateImage}
                            disabled={generatingImage || diary.images.length >= 3}
                        >
                            {generatingImage ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <IconSymbol name="sparkles" size={16} color="#fff" />
                                    <Text style={styles.generateButtonText}>
                                        {diary.images.length >= 3 ? '최대' : '생성'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {diary.images.length === 0 ? (
                        <View style={styles.noImageContainer}>
                            <IconSymbol name="photo" size={48} color="#ccc" />
                            <Text style={styles.noImageText}>
                                AI가 일기 내용을 바탕으로{'\n'}이미지를 생성합니다
                            </Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {diary.images.map((image) => (
                                <View key={image.id} style={styles.imageWrapper}>
                                    <Image
                                        source={{ uri: image.image_url }}
                                        style={styles.image}
                                        resizeMode="cover"
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* 유사 일기 섹션 */}
                {similarDiaries.length > 0 && (
                    <View style={styles.similarSection}>
                        <Text style={styles.similarTitle}>🧠 회상: 비슷한 날의 기억</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarList}>
                            {similarDiaries.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.similarCard}
                                    onPress={() => router.push(`/diary/${item.id}` as any)}
                                >
                                    <Text style={styles.similarCardDate}>{item.date}</Text>
                                    <Text style={styles.similarCardTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.similarCardPreview} numberOfLines={2}>
                                        {item.preview || (item.content ? item.content.substring(0, 50) : '')}
                                    </Text>
                                    <View style={styles.similarCardEmotion}>
                                        <Text>{item.emotion}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </ScrollView>
        </FadeInView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    headerButton: {
        padding: 4,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    date: {
        fontSize: 14,
        color: '#999',
    },
    contentContainer: {
        padding: 20,
        minHeight: 120, // 본문 영역 최소 높이 확보
    },
    content: {
        fontSize: 16,
        color: '#333',
        lineHeight: 28,
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    imageSection: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    imageSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    imageSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6C63FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    generateButtonDisabled: {
        backgroundColor: '#ccc',
    },
    generateButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    noImageContainer: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
    },
    noImageText: {
        marginTop: 12,
        color: '#999',
        textAlign: 'center',
        lineHeight: 22,
    },
    imageWrapper: {
        marginRight: 12,
        ...Shadows.sm, // 이미지 그림자 추가
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    locationSection: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    locationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    locationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8',
        padding: 16,
        borderRadius: 12,
    },
    locationName: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6C63FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    mapButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },

    // 키워드 스타일
    keywordContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    keywordBadge: {
        backgroundColor: '#F0F0FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0FF',
    },
    keywordText: {
        fontSize: 12,
        color: '#6C63FF',
        fontWeight: '500',
    },
    // 유사 일기 스타일
    similarSection: {
        padding: 20,
        paddingTop: 0,
        paddingBottom: 40,
    },
    similarTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    similarList: {
        flexGrow: 0,
    },
    similarCard: {
        width: 160,
        backgroundColor: '#f8f8f8',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    similarCardDate: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    similarCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    similarCardPreview: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
        marginBottom: 8,
    },
    similarCardEmotion: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
});
