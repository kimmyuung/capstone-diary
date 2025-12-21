import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { diaryService, Diary } from '@/services/api';
import { DiaryForm } from '@/components/diary/DiaryForm';

export default function EditDiaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [diary, setDiary] = useState<Diary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async (title: string, content: string) => {
        setIsSubmitting(true);
        try {
            await diaryService.update(Number(id), { title, content });
            Alert.alert('성공', '일기가 수정되었습니다', [
                { text: '확인', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            console.error('Failed to update diary:', err);
            Alert.alert('오류', '일기 수정에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    if (!diary) {
        return null;
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: '일기 수정',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#333',
                }}
            />
            <View style={styles.container}>
                <DiaryForm
                    initialTitle={diary.title}
                    initialContent={diary.content}
                    onSubmit={handleSubmit}
                    submitButtonText="수정 완료"
                    isLoading={isSubmitting}
                />
            </View>
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
});
