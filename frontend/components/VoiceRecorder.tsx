import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { diaryService } from '../services/api';

interface Props {
    diaryId: number;
    existingVoiceUrl?: string | null;
    transcription?: string | null;
    isTranscribing?: boolean;
    onUpdate?: (voiceUrl: string) => void;
}

export default function VoiceRecorder({ diaryId, existingVoiceUrl, transcription, isTranscribing, onUpdate }: Props) {
    const [recording, setRecording] = useState<Audio.Recording | undefined>();
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [sound, setSound] = useState<Audio.Sound | undefined>();
    const [isPlaying, setIsPlaying] = useState(false);
    const [voiceUrl, setVoiceUrl] = useState<string | null>(existingVoiceUrl || null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [recording, sound]);

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                console.log('Requesting permission..');
                const permission = await requestPermission();
                if (permission.status !== 'granted') return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('오류', '녹음을 시작할 수 없습니다.');
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        setRecording(undefined);
        if (!recording) return;

        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        if (uri) {
            // confirm upload
            Alert.alert('녹음 완료', '녹음된 음성을 저장하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                    text: '저장',
                    onPress: () => uploadRecording(uri),
                },
            ]);
        }
    }

    async function uploadRecording(uri: string) {
        setIsUploading(true);
        try {
            const updatedDiary = await diaryService.uploadVoice(diaryId, uri);
            if (updatedDiary.voice_file) {
                setVoiceUrl(updatedDiary.voice_file);
                if (onUpdate) onUpdate(updatedDiary.voice_file);
                Alert.alert('성공', '음성 기록이 저장되었습니다.');
            }
        } catch (error) {
            console.error('Upload failed', error);
            Alert.alert('오류', '음성 파일 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
        }
    }

    async function playSound() {
        if (!voiceUrl) return;

        try {
            console.log('Loading Sound');
            const { sound } = await Audio.Sound.createAsync({ uri: voiceUrl });
            setSound(sound);

            console.log('Playing Sound');
            setIsPlaying(true);
            await sound.playAsync();

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                }
            });
        } catch (error) {
            console.error('Play failed', error);
            Alert.alert('오류', '재생에 실패했습니다.');
        }
    }

    async function stopSound() {
        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="mic" size={20} color="#333" />
                <Text style={styles.title}>음성 기록</Text>
            </View>

            <View style={styles.controls}>
                {voiceUrl ? (
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={isPlaying ? stopSound : playSound}
                    >
                        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#6C5CE7" />
                        <Text style={styles.playText}>
                            {isPlaying ? '일시정지' : '다시 듣기'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.recordButton, recording ? styles.recording : {}]}
                        onPress={recording ? stopRecording : startRecording}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Ionicons name={recording ? "stop" : "mic"} size={24} color="white" />
                        )}
                        <Text style={styles.recordText}>
                            {isUploading ? '저장 중...' : recording ? '녹음 중지' : '녹음 시작'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {(transcription || isTranscribing) && (
                <View style={styles.transcriptionContainer}>
                    <Text style={styles.transcriptionLabel}>변환된 텍스트</Text>
                    {isTranscribing ? (
                        <View style={styles.transcribingRow}>
                            <ActivityIndicator size="small" color="#6C5CE7" />
                            <Text style={styles.transcribingText}>음성을 텍스트로 변환 중입니다...</Text>
                        </View>
                    ) : (
                        <Text style={styles.transcriptionText}>{transcription}</Text>
                    )}
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
        marginTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    controls: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 8,
    },
    recording: {
        backgroundColor: '#FA5252',
        borderWidth: 2,
        borderColor: '#FF8787',
    },
    recordText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0E0FF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 8,
    },
    playText: {
        color: '#6C5CE7',
        fontWeight: '600',
        fontSize: 16,
    },
    transcriptionContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        width: '100%',
    },
    transcriptionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginBottom: 8,
    },
    transcriptionText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    transcribingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    transcribingText: {
        color: '#6C5CE7',
        fontSize: 14,
    }
});
