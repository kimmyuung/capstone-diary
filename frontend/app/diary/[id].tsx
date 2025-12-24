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
import { diaryService, Diary } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function DiaryDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [diary, setDiary] = useState<Diary | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingImage, setGeneratingImage] = useState(false);

    useEffect(() => {
        fetchDiary();
    }, [id]);

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

    const handleGenerateImage = async () => {
        if (!diary) return;

        // 최대 3장 제한
        if (diary.images.length >= 3) {
            Alert.alert('알림', 'AI 이미지는 일기당 최대 3장까지 생성할 수 있습니다.');
            return;
        }

        setGeneratingImage(true);
        try {
            const newImage = await diaryService.generateImage(diary.id);
            setDiary({
                ...diary,
                images: [...diary.images, newImage],
            });
            Alert.alert('성공', 'AI 이미지가 생성되었습니다!');
        } catch (err) {
            console.error('Failed to generate image:', err);
            Alert.alert('오류', '이미지 생성에 실패했습니다');
        } finally {
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
                        Alert.alert('성공', '일기가 삭제되었습니다', [
                            { text: '확인', onPress: () => router.back() },
                        ]);
                    } catch (err) {
                        Alert.alert('오류', '일기 삭제에 실패했습니다');
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
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    if (!diary) {
        return (
            <View style={styles.loadingContainer}>
                <Text>일기를 찾을 수 없습니다</Text>
            </View>
        );
    }

    return (
        <>
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
                </View>

                <View style={styles.contentContainer}>
                    <Text style={styles.content}>{diary.content}</Text>
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
            </ScrollView>
        </>
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
    },
    content: {
        fontSize: 16,
        color: '#333',
        lineHeight: 28,
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
});
