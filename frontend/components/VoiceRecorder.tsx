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
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [pendingUri, setPendingUri] = useState<string | null>(null);
    const [previewSound, setPreviewSound] = useState<Audio.Sound | undefined>();
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

    // 녹음 시간 업데이트 타이머
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (recording) {
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [recording]);

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
            if (sound) {
                sound.unloadAsync();
            }
            if (previewSound) {
                previewSound.unloadAsync();
            }
        };
    }, [recording, sound, previewSound]);

    // 시간 포맷 함수
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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

            // 기존 녹음 초기화
            setPendingUri(null);
            setRecordingDuration(0);

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
            // 녹음 완료 후 미리듣기 상태로 전환
            setPendingUri(uri);
        }
    }

    // 미리듣기 재생
    async function playPreview() {
        if (!pendingUri) return;
        try {
            const { sound } = await Audio.Sound.createAsync({ uri: pendingUri });
            setPreviewSound(sound);
            setIsPreviewPlaying(true);
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPreviewPlaying(false);
                }
            });
        } catch (error) {
            console.error('Preview play failed', error);
        }
    }

    // 미리듣기 정지
    async function stopPreview() {
        if (previewSound) {
            await previewSound.stopAsync();
            setIsPreviewPlaying(false);
        }
    }

    // 재녹음
    function handleReRecord() {
        setPendingUri(null);
        setRecordingDuration(0);
    }

    // 저장 확인
    function handleConfirmSave() {
        if (pendingUri) {
            uploadRecording(pendingUri);
            setPendingUri(null);
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
                ) : pendingUri ? (
                    // 미리듣기 상태 - 녹음 완료 후 저장 전
                    <View style={styles.previewContainer}>
                        <Text style={styles.previewTitle}>🎙️ 녹음 완료 ({formatDuration(recordingDuration)})</Text>
                        <View style={styles.previewButtons}>
                            <TouchableOpacity
                                style={styles.previewPlayButton}
                                onPress={isPreviewPlaying ? stopPreview : playPreview}
                            >
                                <Ionicons name={isPreviewPlaying ? "pause" : "play"} size={20} color="#6C5CE7" />
                                <Text style={styles.previewPlayText}>
                                    {isPreviewPlaying ? '정지' : '미리듣기'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.reRecordButton}
                                onPress={handleReRecord}
                            >
                                <Ionicons name="refresh" size={20} color="#999" />
                                <Text style={styles.reRecordText}>재녹음</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleConfirmSave}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Ionicons name="checkmark" size={20} color="white" />
                                )}
                                <Text style={styles.saveButtonText}>
                                    {isUploading ? '저장중' : '저장'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // 녹음 중 또는 시작 전
                    <View style={styles.recordingContainer}>
                        {recording && (
                            <View style={styles.recordingTimer}>
                                <View style={styles.recordingDot} />
                                <Text style={styles.recordingTimeText}>
                                    {formatDuration(recordingDuration)}
                                </Text>
                            </View>
                        )}
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
                    </View>
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
    },
    // 녹음 시간 표시 스타일
    recordingContainer: {
        alignItems: 'center',
    },
    recordingTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF4444',
    },
    recordingTimeText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FF4444',
        fontVariant: ['tabular-nums'],
    },
    // 미리듣기 상태 스타일
    previewContainer: {
        alignItems: 'center',
        width: '100%',
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    previewButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    previewPlayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0E0FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    previewPlayText: {
        color: '#6C5CE7',
        fontWeight: '600',
        fontSize: 14,
    },
    reRecordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    reRecordText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
});
