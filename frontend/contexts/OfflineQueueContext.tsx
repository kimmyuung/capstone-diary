/**
 * 오프라인 큐 Context
 * 
 * 네트워크 끊김 시 중요 요청을 큐에 저장하고, 연결 복구 시 자동 재전송합니다.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { offlineStorage, OfflineRequest } from '@/utils/offlineStorage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { api, CreateDiaryRequest, UpdateDiaryRequest } from '@/services/api';
import { Alert } from 'react-native';

interface OfflineQueueContextType {
    /** 대기 중인 요청 목록 */
    pendingRequests: OfflineRequest[];
    /** 오프라인 상태인지 */
    isOffline: boolean;
    /** 현재 동기화 중인지 */
    isSyncing: boolean;
    /** 일기 작성 요청 큐에 추가 (오프라인용) */
    queueCreateDiary: (data: CreateDiaryRequest) => Promise<void>;
    /** 일기 수정 요청 큐에 추가 (오프라인용) */
    queueUpdateDiary: (id: number, data: UpdateDiaryRequest) => Promise<void>;
    /** 수동으로 큐 동기화 */
    syncQueue: () => Promise<void>;
    /** 큐에서 요청 제거 */
    removeFromQueue: (id: string) => Promise<void>;
}

const OfflineQueueContext = createContext<OfflineQueueContextType | null>(null);

interface OfflineQueueProviderProps {
    children: ReactNode;
}

export const OfflineQueueProvider: React.FC<OfflineQueueProviderProps> = ({ children }) => {
    const [pendingRequests, setPendingRequests] = useState<OfflineRequest[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // 네트워크 상태 감지 & 연결 복구 시 자동 동기화
    const { isOffline, isOnline } = useNetworkStatus({
        onConnected: () => {
            // 연결 복구 시 자동 동기화
            syncQueue();
        },
    });

    // 초기 큐 로드
    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        const queue = await offlineStorage.getQueue();
        setPendingRequests(queue);
    };

    /**
     * 일기 작성을 오프라인 큐에 추가
     */
    const queueCreateDiary = useCallback(async (data: CreateDiaryRequest) => {
        const request = await offlineStorage.addRequest('CREATE_DIARY', data);
        setPendingRequests(prev => [...prev, request]);

        Alert.alert(
            '오프라인 저장',
            '네트워크에 연결되면 자동으로 저장됩니다.',
            [{ text: '확인' }]
        );
    }, []);

    /**
     * 일기 수정을 오프라인 큐에 추가
     */
    const queueUpdateDiary = useCallback(async (id: number, data: UpdateDiaryRequest) => {
        const request = await offlineStorage.addRequest('UPDATE_DIARY', { id, ...data });
        setPendingRequests(prev => [...prev, request]);

        Alert.alert(
            '오프라인 저장',
            '네트워크에 연결되면 자동으로 저장됩니다.',
            [{ text: '확인' }]
        );
    }, []);

    /**
     * 큐에서 요청 제거
     */
    const removeFromQueue = useCallback(async (id: string) => {
        await offlineStorage.removeRequest(id);
        setPendingRequests(prev => prev.filter(req => req.id !== id));
    }, []);

    /**
     * 큐 동기화 (재전송)
     */
    const syncQueue = useCallback(async () => {
        if (isSyncing || !isOnline) return;

        const queue = await offlineStorage.getQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);

        if (__DEV__) {
            console.log(`[OfflineQueue] Syncing ${queue.length} requests...`);
        }

        let successCount = 0;
        let failCount = 0;

        for (const request of queue) {
            try {
                await processRequest(request);
                await offlineStorage.removeRequest(request.id);
                successCount++;
            } catch (error) {
                console.error(`[OfflineQueue] Failed to sync request:`, request.id, error);
                await offlineStorage.incrementRetry(request.id);
                failCount++;
            }
        }

        // 큐 새로 로드
        await loadQueue();
        setIsSyncing(false);

        // 결과 알림
        if (successCount > 0) {
            Alert.alert(
                '동기화 완료',
                `${successCount}개의 요청이 저장되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`,
                [{ text: '확인' }]
            );
        }
    }, [isSyncing, isOnline]);

    /**
     * 개별 요청 처리
     */
    const processRequest = async (request: OfflineRequest): Promise<void> => {
        switch (request.type) {
            case 'CREATE_DIARY': {
                const data = request.payload as CreateDiaryRequest;
                await api.post('/api/diaries/', data);
                break;
            }
            case 'UPDATE_DIARY': {
                const { id, ...data } = request.payload as UpdateDiaryRequest & { id: number };
                await api.put(`/api/diaries/${id}/`, data);
                break;
            }
            case 'DELETE_DIARY': {
                const { id } = request.payload as { id: number };
                await api.delete(`/api/diaries/${id}/`);
                break;
            }
            default:
                console.warn(`[OfflineQueue] Unknown request type:`, request.type);
        }
    };

    return (
        <OfflineQueueContext.Provider
            value={{
                pendingRequests,
                isOffline,
                isSyncing,
                queueCreateDiary,
                queueUpdateDiary,
                syncQueue,
                removeFromQueue,
            }}
        >
            {children}
        </OfflineQueueContext.Provider>
    );
};

/**
 * 오프라인 큐 훅
 */
export const useOfflineQueue = (): OfflineQueueContextType => {
    const context = useContext(OfflineQueueContext);
    if (!context) {
        throw new Error('useOfflineQueue must be used within OfflineQueueProvider');
    }
    return context;
};

export default OfflineQueueContext;
