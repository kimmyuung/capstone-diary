import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    uri: string | null;
}

interface UseVoiceRecordingReturn {
    state: RecordingState;
    startRecording: () => Promise<void>;
    pauseRecording: () => Promise<void>;
    resumeRecording: () => Promise<void>;
    stopRecording: () => Promise<string | null>;
    getRecordingBlob: () => Promise<Blob | null>;
}

export const useVoiceRecording = (): UseVoiceRecordingReturn => {
    const [state, setState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        uri: null,
    });

    const recordingRef = useRef<Audio.Recording | null>(null);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startDurationTimer = useCallback(() => {
        durationIntervalRef.current = setInterval(() => {
            setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    }, []);

    const stopDurationTimer = useCallback(() => {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            // 오디오 권한 요청
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                throw new Error('마이크 권한이 필요합니다');
            }

            // 오디오 모드 설정
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // 녹음 설정 (Whisper API 최적화)
            const recordingOptions: Audio.RecordingOptions = {
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                },
            };

            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync(recordingOptions);
            await recording.startAsync();

            recordingRef.current = recording;
            setState({
                isRecording: true,
                isPaused: false,
                duration: 0,
                uri: null,
            });

            startDurationTimer();
        } catch (error) {
            console.error('녹음 시작 실패:', error);
            throw error;
        }
    }, [startDurationTimer]);

    const pauseRecording = useCallback(async () => {
        if (!recordingRef.current) return;

        try {
            await recordingRef.current.pauseAsync();
            stopDurationTimer();
            setState((prev) => ({ ...prev, isPaused: true }));
        } catch (error) {
            console.error('녹음 일시정지 실패:', error);
            throw error;
        }
    }, [stopDurationTimer]);

    const resumeRecording = useCallback(async () => {
        if (!recordingRef.current) return;

        try {
            await recordingRef.current.startAsync();
            startDurationTimer();
            setState((prev) => ({ ...prev, isPaused: false }));
        } catch (error) {
            console.error('녹음 재개 실패:', error);
            throw error;
        }
    }, [startDurationTimer]);

    const stopRecording = useCallback(async (): Promise<string | null> => {
        if (!recordingRef.current) return null;

        try {
            stopDurationTimer();
            await recordingRef.current.stopAndUnloadAsync();

            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            setState((prev) => ({
                ...prev,
                isRecording: false,
                isPaused: false,
                uri,
            }));

            return uri;
        } catch (error) {
            console.error('녹음 종료 실패:', error);
            throw error;
        }
    }, [stopDurationTimer]);

    const getRecordingBlob = useCallback(async (): Promise<Blob | null> => {
        if (!state.uri) return null;

        try {
            if (Platform.OS === 'web') {
                const response = await fetch(state.uri);
                return await response.blob();
            } else {
                const base64 = await FileSystem.readAsStringAsync(state.uri, {
                    encoding: 'base64' as any,
                });
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: 'audio/m4a' });
            }
        } catch (error) {
            console.error('Blob 변환 실패:', error);
            return null;
        }
    }, [state.uri]);

    return {
        state,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        getRecordingBlob,
    };
};

export default useVoiceRecording;
