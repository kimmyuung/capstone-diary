/**
 * 네트워크 상태 감지 훅
 * 
 * 온라인/오프라인 상태를 감지하고 연결 복구 시 콜백을 실행합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
}

interface UseNetworkStatusOptions {
    onConnected?: () => void;
    onDisconnected?: () => void;
}

/**
 * 네트워크 상태 훅
 */
export const useNetworkStatus = (options?: UseNetworkStatusOptions) => {
    const [status, setStatus] = useState<NetworkStatus>({
        isConnected: null,
        isInternetReachable: null,
        type: null,
    });

    const wasOfflineRef = useRef(false);
    // options 참조를 안정화하여 무한 루프 방지
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const handleNetworkChange = useCallback((state: NetInfoState) => {
        const isOnline = state.isConnected && state.isInternetReachable;

        setStatus({
            isConnected: state.isConnected,
            isInternetReachable: state.isInternetReachable,
            type: state.type,
        });

        // 오프라인에서 온라인으로 전환
        if (isOnline && wasOfflineRef.current) {
            if (__DEV__) {
                console.log('[Network] Connection restored');
            }
            optionsRef.current?.onConnected?.();
        }

        // 온라인에서 오프라인으로 전환
        if (!isOnline && !wasOfflineRef.current && wasOfflineRef.current !== null) {
            if (__DEV__) {
                console.log('[Network] Connection lost');
            }
            optionsRef.current?.onDisconnected?.();
        }

        wasOfflineRef.current = !isOnline;
    }, []);

    useEffect(() => {
        // 초기 상태 확인
        NetInfo.fetch().then(handleNetworkChange);

        // 상태 변화 구독
        const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

        return () => {
            unsubscribe();
        };
    }, [handleNetworkChange]);

    return {
        ...status,
        isOffline: status.isConnected === false || status.isInternetReachable === false,
        isOnline: status.isConnected === true && status.isInternetReachable !== false,
    };
};

export default useNetworkStatus;
