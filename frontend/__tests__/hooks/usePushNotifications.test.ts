/**
 * usePushNotifications Hook 테스트
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock expo modules
jest.mock('expo-device', () => ({
    isDevice: true,
}));

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
    setNotificationChannelAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
    cancelAllScheduledNotificationsAsync: jest.fn(),
    addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    AndroidImportance: { HIGH: 4 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Import after mocks
import { usePushNotifications } from '@/hooks/usePushNotifications';
import * as Notifications from 'expo-notifications';

describe('usePushNotifications', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
    });

    describe('초기화', () => {
        it('훅이 초기값으로 렌더링됨', async () => {
            const { result } = renderHook(() => usePushNotifications());

            expect(result.current.expoPushToken).toBeNull();
            expect(result.current.reminderSettings.enabled).toBe(false);
            expect(result.current.reminderSettings.hour).toBe(20);
            expect(result.current.reminderSettings.minute).toBe(0);
        });

        it('저장된 설정을 로드함', async () => {
            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('true')  // enabled
                .mockResolvedValueOnce(JSON.stringify({ hour: 21, minute: 30 }))  // time
                .mockResolvedValueOnce('ExponentPushToken[saved]');  // token

            const { result } = renderHook(() => usePushNotifications());

            await waitFor(() => {
                expect(result.current.reminderSettings.enabled).toBe(true);
            });

            expect(result.current.reminderSettings.hour).toBe(21);
            expect(result.current.reminderSettings.minute).toBe(30);
        });
    });

    describe('registerForPushNotifications', () => {
        it('권한 허용 시 토큰 발급', async () => {
            const { result } = renderHook(() => usePushNotifications());

            let token: string | null = null;
            await act(async () => {
                token = await result.current.registerForPushNotifications();
            });

            expect(token).toBe('ExponentPushToken[test]');
            expect(result.current.expoPushToken).toBe('ExponentPushToken[test]');
            expect(result.current.permissionGranted).toBe(true);
        });

        it('권한 거부 시 null 반환', async () => {
            (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

            const { result } = renderHook(() => usePushNotifications());

            let token: string | null = null;
            await act(async () => {
                token = await result.current.registerForPushNotifications();
            });

            expect(token).toBeNull();
            expect(result.current.permissionGranted).toBe(false);
        });
    });

    describe('toggleReminder', () => {
        it('리마인더 활성화 시 스케줄 예약', async () => {
            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.toggleReminder(true);
            });

            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'diary_reminder_enabled',
                'true'
            );
        });

        it('리마인더 비활성화 시 스케줄 취소', async () => {
            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.toggleReminder(false);
            });

            expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'diary_reminder_enabled',
                'false'
            );
        });
    });

    describe('setReminderTime', () => {
        it('리마인더 시간 변경', async () => {
            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.setReminderTime(19, 30);
            });

            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'diary_reminder_time',
                JSON.stringify({ hour: 19, minute: 30 })
            );
        });
    });

    describe('sendTestNotification', () => {
        it('테스트 알림 즉시 전송', async () => {
            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.sendTestNotification();
            });

            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.objectContaining({
                        title: '🧪 테스트 알림',
                    }),
                    trigger: null,
                })
            );
        });
    });
});
