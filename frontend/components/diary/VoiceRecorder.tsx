import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { speechService } from '@/services/api';

interface VoiceRecorderProps {
    onTranscription: (text: string) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    language?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onTranscription,
    onRecordingStateChange,
    language = 'ko',
}) => {
    const { state, startRecording, pauseRecording, resumeRecording, stopRecording } =
        useVoiceRecording();
    const [isTranscribing, setIsTranscribing] = useState(false);

    // 녹음 중 애니메이션
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnim1 = useRef(new Animated.Value(0.3)).current;
    const waveAnim2 = useRef(new Animated.Value(0.3)).current;
    const waveAnim3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        onRecordingStateChange?.(state.isRecording);

        if (state.isRecording && !state.isPaused) {
            // 펄스 애니메이션
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 600,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // 음파 애니메이션
            const animateWave = (anim: Animated.Value, delay: number) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 400,
                            easing: Easing.ease,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0.3,
                            duration: 400,
                            easing: Easing.ease,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            };

            animateWave(waveAnim1, 0);
            animateWave(waveAnim2, 150);
            animateWave(waveAnim3, 300);
        } else {
            // 애니메이션 중지
            pulseAnim.setValue(1);
            waveAnim1.setValue(0.3);
            waveAnim2.setValue(0.3);
            waveAnim3.setValue(0.3);
        }
    }, [state.isRecording, state.isPaused]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartRecording = async () => {
        try {
            await startRecording();
        } catch (error: any) {
            Alert.alert('오류', error.message || '녹음을 시작할 수 없습니다');
        }
    };

    const handlePauseResume = async () => {
        try {
            if (state.isPaused) {
                await resumeRecording();
            } else {
                await pauseRecording();
            }
        } catch (error) {
            Alert.alert('오류', '녹음 상태를 변경할 수 없습니다');
        }
    };

    const handleStopRecording = async () => {
        try {
            setIsTranscribing(true);
            const uri = await stopRecording();

            if (uri) {
                const formData = new FormData();
                formData.append('audio', {
                    uri,
                    name: 'recording.m4a',
                    type: 'audio/m4a',
                } as any);
                formData.append('language', language);

                try {
                    const result = await speechService.transcribe(formData, language);
                    onTranscription(result.text);
                } catch (apiError) {
                    console.error('Transcription API error:', apiError);
                    Alert.alert('변환 실패', '음성을 텍스트로 변환하는데 실패했습니다');
                }
            }
        } catch (error) {
            Alert.alert('오류', '녹음을 종료할 수 없습니다');
        } finally {
            setIsTranscribing(false);
        }
    };

    // 녹음 중이 아닐 때
    if (!state.isRecording && !isTranscribing) {
        return (
            <View style={styles.container}>
                <View style={styles.idleContainer}>
                    <TouchableOpacity
                        style={styles.mainRecordButton}
                        onPress={handleStartRecording}
                        activeOpacity={0.8}
                    >
                        <View style={styles.micIconContainer}>
                            <IconSymbol name="mic.fill" size={36} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.hintText}>탭하여 음성 녹음 시작</Text>
                </View>
            </View>
        );
    }

    // 변환 중
    if (isTranscribing) {
        return (
            <View style={styles.container}>
                <View style={styles.transcribingContainer}>
                    <View style={styles.transcribingIcon}>
                        <ActivityIndicator size="large" color="#6C63FF" />
                    </View>
                    <Text style={styles.transcribingTitle}>음성 변환 중...</Text>
                    <Text style={styles.transcribingSubtitle}>AI가 텍스트로 변환하고 있습니다</Text>
                </View>
            </View>
        );
    }

    // 녹음 중
    return (
        <View style={styles.container}>
            <View style={styles.recordingContainer}>
                {/* 녹음 상태 헤더 */}
                <View style={styles.recordingHeader}>
                    <View style={[styles.statusDot, state.isPaused && styles.pausedDot]} />
                    <Text style={styles.statusText}>
                        {state.isPaused ? '일시정지됨' : '녹음 중'}
                    </Text>
                </View>

                {/* 시간 표시 */}
                <Text style={styles.timerText}>{formatDuration(state.duration)}</Text>

                {/* 음파 시각화 */}
                <View style={styles.waveContainer}>
                    <Animated.View
                        style={[
                            styles.waveBar,
                            { transform: [{ scaleY: waveAnim1 }] }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.waveBar,
                            styles.waveBarTall,
                            { transform: [{ scaleY: waveAnim2 }] }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.waveBar,
                            { transform: [{ scaleY: waveAnim3 }] }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.waveBar,
                            styles.waveBarTall,
                            { transform: [{ scaleY: waveAnim1 }] }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.waveBar,
                            { transform: [{ scaleY: waveAnim2 }] }
                        ]}
                    />
                </View>

                {/* 컨트롤 버튼 */}
                <View style={styles.controlsRow}>
                    {/* 취소 버튼 */}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => stopRecording()}
                    >
                        <IconSymbol name="xmark" size={20} color="#666" />
                        <Text style={styles.secondaryButtonText}>취소</Text>
                    </TouchableOpacity>

                    {/* 메인 버튼 (일시정지/재개) */}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity
                            style={[styles.mainButton, state.isPaused && styles.resumeButton]}
                            onPress={handlePauseResume}
                            activeOpacity={0.8}
                        >
                            <IconSymbol
                                name={state.isPaused ? 'play.fill' : 'pause.fill'}
                                size={32}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* 완료 버튼 */}
                    <TouchableOpacity
                        style={[styles.secondaryButton, styles.completeButton]}
                        onPress={handleStopRecording}
                    >
                        <IconSymbol name="checkmark" size={20} color="#fff" />
                        <Text style={[styles.secondaryButtonText, styles.completeButtonText]}>완료</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },

    // 대기 상태
    idleContainer: {
        alignItems: 'center',
        padding: 24,
    },
    mainRecordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FF4757',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    micIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hintText: {
        marginTop: 16,
        fontSize: 14,
        color: '#999',
    },

    // 변환 중
    transcribingContainer: {
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#F8F9FF',
        borderRadius: 16,
    },
    transcribingIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    transcribingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    transcribingSubtitle: {
        fontSize: 13,
        color: '#999',
    },

    // 녹음 중
    recordingContainer: {
        backgroundColor: '#FFF5F5',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFE0E0',
    },
    recordingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF4757',
        marginRight: 8,
    },
    pausedDot: {
        backgroundColor: '#FFB800',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF4757',
    },
    timerText: {
        fontSize: 48,
        fontWeight: '200',
        color: '#333',
        letterSpacing: 4,
        marginVertical: 16,
    },

    // 음파 시각화
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        gap: 6,
        marginBottom: 24,
    },
    waveBar: {
        width: 6,
        height: 30,
        backgroundColor: '#FF4757',
        borderRadius: 3,
    },
    waveBarTall: {
        height: 40,
    },

    // 컨트롤
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    mainButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FF4757',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    resumeButton: {
        backgroundColor: '#4CAF50',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        gap: 6,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    completeButton: {
        backgroundColor: '#6C63FF',
    },
    completeButtonText: {
        color: '#fff',
    },
});

export default VoiceRecorder;
