import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Diary } from '../services/types';
import { diaryService } from '../services/diary';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    diary: Diary;
    onUpdate: (updatedDiary: Diary) => void;
}

export default function ReflectionCard({ diary, onUpdate }: Props) {
    const [answer, setAnswer] = useState(diary.reflection_answer || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(!diary.reflection_answer);

    if (!diary.reflection_question) return null;

    const handleSave = async () => {
        if (!answer.trim()) return;

        setIsSaving(true);
        try {
            // API call to update answer (assumes sending partial update is supported)
            // Note: Diary update API usually expects full object or we might need a specific endpoint
            // For now, we update the diary field.
            // Ideally, backend should support PATCH /api/diaries/{id}/ with partial data.
            const updated = await diaryService.update(diary.id, {
                reflection_answer: answer
            });

            // Actually, standard updateDiary might replace content. 
            // Let's check diaryService implementation. 
            // If needed, we implement updateReflectionAnswer in diaryService.

            // Temporary: Since we might need to update the whole object or add a specific method.
            // Let's implement a specific method in diaryService for cleaner code: updateReflection
        } catch (error) {
            console.error('Failed to save reflection:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="sparkles" size={20} color="#6C5CE7" />
                <Text style={styles.title}>오늘의 회고</Text>
            </View>

            <Text style={styles.question}>{diary.reflection_question}</Text>

            {isEditing ? (
                <View>
                    <TextInput
                        style={styles.input}
                        multiline
                        placeholder="나의 답변을 적어보세요..."
                        value={answer}
                        onChangeText={setAnswer}
                    />
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.disabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.saveText}>저장하기</Text>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <Text style={styles.answer}>{diary.reflection_answer}</Text>
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Text style={styles.editLink}>수정하기</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 20,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#343A40',
        marginLeft: 8,
    },
    question: {
        fontSize: 16,
        color: '#495057',
        marginBottom: 15,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#CED4DA',
        fontSize: 15,
        marginBottom: 10,
    },
    answer: {
        fontSize: 15,
        color: '#343A40',
        lineHeight: 22,
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 8,
    },
    saveButton: {
        backgroundColor: '#6C5CE7',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.7,
    },
    saveText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
    editLink: {
        color: '#ADB5BD',
        fontSize: 13,
        textAlign: 'right',
        marginTop: 5,
    }
});
