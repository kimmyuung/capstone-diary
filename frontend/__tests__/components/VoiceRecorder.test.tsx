import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VoiceRecorder from '@/components/VoiceRecorder';
import { diaryService } from '@/services/diary';
import { Audio } from 'expo-av';

// Mock diaryService
jest.mock('@/services/diary', () => ({
    diaryService: {
        uploadVoice: jest.fn(),
    },
}));

// Mock expo-av
jest.mock('expo-av', () => ({
    Audio: {
        // Return Promise for requestPermissionsAsync
        requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
        // Hook returns [status, requestPermission]
        usePermissions: jest.fn(() => [
            { status: 'granted' },
            jest.fn().mockResolvedValue({ status: 'granted' })
        ]),
        setAudioModeAsync: jest.fn(),
        Recording: {
            createAsync: jest.fn(() =>
                Promise.resolve({
                    recording: {
                        startAsync: jest.fn(),
                        stopAndUnloadAsync: jest.fn(),
                        getURI: jest.fn(() => 'file:///test-recording.m4a'),
                        setOnRecordingStatusUpdate: jest.fn(),
                    },
                })
            ),
            RecordingOptionsPresets: {
                HIGH_QUALITY: {},
            },
        },
        Sound: {
            createAsync: jest.fn(() =>
                Promise.resolve({
                    sound: {
                        playAsync: jest.fn(),
                        pauseAsync: jest.fn(),
                        unloadAsync: jest.fn(),
                        stopAsync: jest.fn(),
                        setOnPlaybackStatusUpdate: jest.fn(),
                    },
                })
            ),
        },
    },
}));

describe('VoiceRecorder', () => {
    const mockDiaryId = 1;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByText } = render(<VoiceRecorder diaryId={mockDiaryId} />);
        expect(getByText('녹음 시작')).toBeTruthy();
    });

    it('handles recording flow', async () => {
        const { getByText } = render(<VoiceRecorder diaryId={mockDiaryId} />);

        // Start Recording
        fireEvent.press(getByText('녹음 시작'));

        // Wait for the button text to change to "녹음 중지"
        await waitFor(() => {
            expect(getByText('녹음 중지')).toBeTruthy();
        });
    });

    it('renders playback controls when voice exists', () => {
        const { getByText } = render(
            <VoiceRecorder
                diaryId={mockDiaryId}
                existingVoiceUrl="https://example.com/voice.m4a"
            />
        );

        expect(getByText('다시 듣기')).toBeTruthy();
    });
});
