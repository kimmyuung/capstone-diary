/**
 * Push Notifications Hook
 * 
 * 푸시 알림 권한 요청, 토큰 발급, 로컬 알림 스케줄링 기능 제공
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 알림 핸들러 설정 (앱이 포그라운드일 때 알림 표시)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// AsyncStorage 키
const REMINDER_ENABLED_KEY = 'diary_reminder_enabled';
const REMINDER_TIME_KEY = 'diary_reminder_time';
const PUSH_TOKEN_KEY = 'push_token';

export interface ReminderSettings {
    enabled: boolean;
    hour: number;
    minute: number;
}

export interface PushNotificationState {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    reminderSettings: ReminderSettings;
}

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
        enabled: false,
        hour: 20,
        minute: 0,
    });
    const [permissionGranted, setPermissionGranted] = useState(false);

    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    // 저장된 설정 로드
    const loadSettings = useCallback(async () => {
        try {
            const [enabledStr, timeStr, token] = await Promise.all([
                AsyncStorage.getItem(REMINDER_ENABLED_KEY),
                AsyncStorage.getItem(REMINDER_TIME_KEY),
                AsyncStorage.getItem(PUSH_TOKEN_KEY),
            ]);

            if (enabledStr !== null) {
                const enabled = enabledStr === 'true';
                const time = timeStr ? JSON.parse(timeStr) : { hour: 20, minute: 0 };
                setReminderSettings({ enabled, ...time });
            }

            if (token) {
                setExpoPushToken(token);
            }
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    }, []);

    // 푸시 알림 권한 요청 및 토큰 발급
    const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
        // 실제 기기에서만 동작
        if (!Device.isDevice) {
            console.log('푸시 알림은 실제 기기에서만 사용 가능합니다.');
            return null;
        }

        // 기존 권한 확인
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // 권한 요청
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('푸시 알림 권한이 거부되었습니다.');
            setPermissionGranted(false);
            return null;
        }

        setPermissionGranted(true);

        try {
            // Expo Push Token 발급
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: undefined, // EAS 없이 로컬 개발용
            });
            const token = tokenData.data;

            setExpoPushToken(token);
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

            console.log('Push Token:', token);
            return token;
        } catch (error) {
            console.error('Failed to get push token:', error);
            return null;
        }
    }, []);

    // Android 알림 채널 설정
    const setupAndroidChannel = useCallback(async () => {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('diary-reminder', {
                name: '일기 리마인더',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF6B6B',
                sound: 'default',
            });
        }
    }, []);

    // 일기 리마인더 스케줄링
    const scheduleDailyReminder = useCallback(async (hour: number, minute: number) => {
        // 기존 예약 취소
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 새 알림 예약
        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: '📝 오늘의 일기',
                body: '오늘 하루는 어땠나요? 감정을 기록해보세요.',
                sound: true,
                data: { type: 'diary_reminder' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
            },
        });

        console.log('Daily reminder scheduled:', identifier);
        return identifier;
    }, []);

    // 리마인더 설정 업데이트
    const updateReminderSettings = useCallback(async (settings: ReminderSettings) => {
        setReminderSettings(settings);

        await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(settings.enabled));
        await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({
            hour: settings.hour,
            minute: settings.minute,
        }));

        if (settings.enabled) {
            await scheduleDailyReminder(settings.hour, settings.minute);
        } else {
            await Notifications.cancelAllScheduledNotificationsAsync();
        }
    }, [scheduleDailyReminder]);

    // 리마인더 토글
    const toggleReminder = useCallback(async (enabled: boolean) => {
        await updateReminderSettings({
            ...reminderSettings,
            enabled,
        });
    }, [reminderSettings, updateReminderSettings]);

    // 리마인더 시간 변경
    const setReminderTime = useCallback(async (hour: number, minute: number) => {
        await updateReminderSettings({
            ...reminderSettings,
            hour,
            minute,
        });
    }, [reminderSettings, updateReminderSettings]);

    // 즉시 테스트 알림 전송
    const sendTestNotification = useCallback(async () => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🧪 테스트 알림',
                body: '푸시 알림이 정상적으로 작동합니다!',
                sound: true,
            },
            trigger: null, // 즉시 전송
        });
    }, []);

    // 초기화
    useEffect(() => {
        loadSettings();
        setupAndroidChannel();

        // 알림 수신 리스너
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                setNotification(notification);
            }
        );

        // 알림 탭 리스너 (사용자가 알림을 탭했을 때)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;
                console.log('Notification tapped:', data);
                // 여기서 라우팅 처리 가능
            }
        );

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [loadSettings, setupAndroidChannel]);

    return {
        expoPushToken,
        notification,
        permissionGranted,
        reminderSettings,
        registerForPushNotifications,
        toggleReminder,
        setReminderTime,
        sendTestNotification,
    };
}

export default usePushNotifications;
