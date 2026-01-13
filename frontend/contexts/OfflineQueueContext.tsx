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

        // 배치 처리를 위한 ID 매핑 (Temp ID -> Real ID)
        const idMap = new Map<string, number>();

        for (const request of queue) {
            try {
                await processRequest(request, idMap);
                await offlineStorage.removeRequest(request.id);
                successCount++;
            } catch (error: any) {
                console.error(`[OfflineQueue] Failed to sync request:`, request.id, error);

                // 409 Conflict 처리 (Optimistic Locking)
                if (error.response && error.response.status === 409) {
                    Alert.alert(
                        '동기화 충돌',
                        '서버에 더 최신 데이터가 있어 일부 변경사항이 적용되지 않았습니다. 데이터를 새로고침 해주세요.',
                        [{ text: '확인' }]
                    );
                    // 충돌난 요청은 큐에서 제거 (계속 실패하므로)
                    await offlineStorage.removeRequest(request.id);
                    failCount++;
                    continue;
                }

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
    const processRequest = async (request: OfflineRequest, idMap: Map<string, number>): Promise<void> => {
        let { type, payload } = request;

        // ID 매핑 적용 (이전 요청에서 생성된 ID로 교체)
        if (idMap.size > 0) {
            if (type === 'UPDATE_DIARY' || type === 'DELETE_DIARY') {
                const payloadObj = payload as { id: any };
                // payload.id가 임시 ID라면 실제 ID로 교체
                if (idMap.has(String(payloadObj.id))) {
                    const realId = idMap.get(String(payloadObj.id))!;
                    if (__DEV__) {
                        console.log(`[OfflineQueue] Mapping ID: ${payloadObj.id} -> ${realId}`);
                    }
                    payload = { ...payloadObj, id: realId };
                }
            }
        }

        switch (type) {
            case 'CREATE_DIARY': {
                const data = payload as CreateDiaryRequest & { id?: string }; // 로컬 임시 ID 포함 가능성

                // 이미지 업로드 처리 (FormData)
                if (data.images && data.images.length > 0) {
                    const formData = new FormData();
                    formData.append('title', data.title);
                    formData.append('content', data.content);
                    if (data.emotion) formData.append('emotion', data.emotion);
                    if (data.weather) formData.append('weather', data.weather);

                    data.images.forEach((imageUri: string) => {
                        const filename = imageUri.split('/').pop() || 'image.jpg';
                        const match = /\.(\w+)$/.exec(filename);
                        const type = match ? `image/${match[1]}` : 'image/jpeg';

                        // React Native FormData format
                        formData.append('images', { uri: imageUri, name: filename, type } as any);
                    });

                    const response = await api.post('/api/diaries/', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    // 성공 시 실제 ID 매핑 저장 (임시 ID가 있다면)
                    if (data.id && response.data.id) {
                        idMap.set(String(data.id), response.data.id);
                    }
                } else {
                    // 일반 JSON 요청
                    const response = await api.post('/api/diaries/', data);
                    // 성공 시 실제 ID 매핑 저장
                    if (data.id && response.data.id) {
                        idMap.set(String(data.id), response.data.id);
                    }
                }
                break;
            }
            case 'UPDATE_DIARY': {
                const { id, ...data } = payload as UpdateDiaryRequest & { id: number };

                // 이미지 업로드 처리 (FormData) - 수정 시에도 이미지가 있을 수 있음
                if (data.images && data.images.length > 0) {
                    const formData = new FormData();
                    if (data.title) formData.append('title', data.title);
                    if (data.content) formData.append('content', data.content);

                    // 기존 이미지는 URL일 것이고, 새 이미지는 file URI일 것임.
                    // 서버 API가 어떻게 처리하는지에 따라 다르지만, 보통 새 파일만 보냄.
                    // 여기서는 단순히 새 이미지만 보낸다고 가정 (구현 필요 시 확장)
                    data.images.forEach((imageUri: string) => {
                        if (!imageUri.startsWith('http')) { // 로컬 파일만 전송
                            const filename = imageUri.split('/').pop() || 'image.jpg';
                            const match = /\.(\w+)$/.exec(filename);
                            const type = match ? `image/${match[1]}` : 'image/jpeg';
                            formData.append('images', { uri: imageUri, name: filename, type } as any);
                        }
                    });

                    await api.put(`/api/diaries/${id}/`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } else {
                    await api.put(`/api/diaries/${id}/`, data);
                }
                break;
            }
            case 'DELETE_DIARY': {
                const { id } = payload as { id: number };
                await api.delete(`/api/diaries/${id}/`);
                break;
            }
            default:
                console.warn(`[OfflineQueue] Unknown request type:`, type);
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
