import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface VoiceInputButtonProps {
    onTranscription: (text: string) => void;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
    onTranscription,
    disabled = false,
    size = 'medium',
}) => {
    const { isDark } = useTheme();
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const buttonSize = {
        small: 36,
        medium: 48,
        large: 60,
    }[size];

    const iconSize = {
        small: 18,
        medium: 24,
        large: 30,
    }[size];

    const handlePress = async () => {
        if (disabled || isProcessing) return;

        if (isRecording) {
            // 녹음 중지 및 전송
            await stopRecording();
        } else {
            // 녹음 시작
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            // 권한 확인
            if (Platform.OS !== 'web') {
                const { Audio } = await import('expo-av');
                const permission = await Audio.requestPermissionsAsync();

                if (!permission.granted) {
                    Alert.alert(
                        '권한 필요',
                        '음성 녹음을 위해 마이크 권한이 필요합니다.',
                        [{ text: '확인' }]
                    );
                    return;
                }

                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
            }

            setIsRecording(true);

            // 실제 녹음 로직 (간단한 시뮬레이션)
            // TODO: expo-av Recording 구현

        } catch (error) {
            console.error('Recording start error:', error);
            Alert.alert('오류', '녹음을 시작할 수 없습니다.');
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        try {
            setIsRecording(false);
            setIsProcessing(true);

            // TODO: 실제 녹음 파일을 서버로 전송
            // const response = await api.post('/api/transcribe/', formData);
            // onTranscription(response.data.text);

            // 임시: 시뮬레이션
            setTimeout(() => {
                setIsProcessing(false);
                onTranscription('음성 입력 테스트입니다.');
            }, 1500);

        } catch (error) {
            console.error('Recording stop error:', error);
            Alert.alert('오류', '음성 인식에 실패했습니다.');
            setIsProcessing(false);
        }
    };

    const getButtonStyle = () => {
        if (isRecording) {
            return [styles.button, styles.buttonRecording];
        }
        if (isProcessing) {
            return [styles.button, styles.buttonProcessing];
        }
        return [
            styles.button,
            isDark ? styles.buttonDark : styles.buttonLight,
        ];
    };

    return (
        <TouchableOpacity
            style={[
                ...getButtonStyle(),
                { width: buttonSize, height: buttonSize },
                disabled && styles.buttonDisabled,
            ]}
            onPress={handlePress}
            disabled={disabled || isProcessing}
            activeOpacity={0.7}
        >
            {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <IconSymbol
                    name={isRecording ? 'stop.fill' : 'mic.fill'}
                    size={iconSize}
                    color={isRecording ? '#fff' : isDark ? Palette.primary[400] : Palette.primary[500]}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
    },
    buttonLight: {
        backgroundColor: Palette.neutral[100],
        borderWidth: 1,
        borderColor: Palette.neutral[200],
    },
    buttonDark: {
        backgroundColor: '#2A2A30',
        borderWidth: 1,
        borderColor: '#3A3A42',
    },
    buttonRecording: {
        backgroundColor: '#EF4444',
    },
    buttonProcessing: {
        backgroundColor: Palette.primary[500],
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default VoiceInputButton;
