/**
 * 오프라인 큐 Context
 * 
 * 네트워크 끊김 시 중요 요청을 큐에 저장하고, 연결 복구 시 자동 재전송합니다.
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { diaryService } from '@/services/diary';
import { offlineStorage, OfflineRequest } from '@/utils/offlineStorage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { api, CreateDiaryRequest, UpdateDiaryRequest } from '@/services/api';

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
    /** 일기 삭제 요청 큐에 추가 (오프라인용) */
    queueDeleteDiary: (id: number) => Promise<void>;
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
     * 일기 삭제 요청 큐에 추가 (오프라인용)
     */
    const queueDeleteDiary = useCallback(async (id: number) => {
        const request = await offlineStorage.addRequest('DELETE_DIARY', { id });
        setPendingRequests(prev => [...prev, request]);

        Alert.alert(
            '오프라인 삭제',
            '네트워크에 연결되면 자동으로 삭제됩니다.',
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
                    console.log(`[OfflineQueue] Conflict detected for ${request.id}. Attempting auto-resolution...`);

                    try {
                        // 1. 최신 데이터 조회 (GET)
                        // UPDATE_DIARY인 경우에만 병합 가능. CREATE는 409가 날 수 없음(일반적으로), DELETE는 이미 삭제됨.
                        if (request.type === 'UPDATE_DIARY') {
                            let diaryId;
                            // ID 매핑 또는 payload ID 확인
                            const payloadObj = request.payload as any;
                            diaryId = payloadObj.id;

                            // 만약 payload id가 string이고 map에 있다면 변환 (이미 processRequest 진입 전/중 로직이 섞여있어서 복잡할 수 있음)
                            // 여기서는 processRequest 호출 전이므로 raw payload임.
                            // 하지만 위 loop 안에서 processRequest를 호출했으므로, 
                            // 이미 실패한 시점.

                            // 간단하게: 실제 ID가 필요함.
                            if (idMap.has(String(diaryId))) {
                                diaryId = idMap.get(String(diaryId));
                            }

                            // 최신 데이터 가져오기
                            const { data: latestDiary } = await api.get(`/api/diaries/${diaryId}/`);

                            // 2. 버전 업데이트 (Merge)
                            // 서버의 최신 버전을 가져와서 내 요청의 버전을 갱신 (덮어쓰기 전략)
                            const newPayload = { ...payloadObj, version: latestDiary.version };

                            // 3. 큐 아이템 업데이트 및 즉시 재시도
                            // (여기서는 retryCount 증가 없이 바로 재시도를 위해 큐만 수정하고 다음 턴에 맡기거나, 
                            //  바로 processRequest를 다시 부를 수도 있음. 안전하게 큐 업데이트만 하고 루프 진행)

                            // 큐에 있는 요청을 수정해서 다시 저장해야 함.
                            // 하지만 현재 구조상 offlineStorage.updateRequest 같은게 없음.
                            // remove -> add 방식으로 교체.

                            await offlineStorage.removeRequest(request.id);
                            // 기존 타임스탬프 등 유지하면서 payload만 교체하여 다시 추가
                            // 단, addRequest는 새 ID를 만드므로, 수동으로 구성해서 저장하거나
                            // 그냥 새 요청으로 취급 (순서가 뒤로 밀릴 수 있음. 근데 큐 맨 뒤로 가면 나중에 처리됨. 괜찮음)

                            await offlineStorage.addRequest(request.type, newPayload);

                            console.log(`[OfflineQueue] Conflict resolved. Re-queued with version ${latestDiary.version}`);
                            // 현재 루프에서는 건너뛰고 다음 sync때 처리됨 (또는 큐 끝에 붙었으므로 이번 루프 끝에서 처리될 수도?)
                            // queue는 getQueue()로 가져온 스냅샷이므로 이번 루프에선 처리 안됨. 다음 sync때 처리.
                            continue;
                        }
                    } catch (resolveError) {
                        console.error(`[OfflineQueue] Auto-resolution failed:`, resolveError);
                        // 해결 실패 시 사용자 알림 후 제거
                        Alert.alert(
                            '동기화 충돌',
                            '서버 데이터와 충돌하여 저장을 완료하지 못했습니다.',
                            [{ text: '확인' }]
                        );
                        await offlineStorage.removeRequest(request.id);
                        failCount++;
                        continue;
                    }
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



    // ... (existing code)

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
                const data = payload as any;

                // 이미지 업로드 처리 (FormData)
                if (data.images && data.images.length > 0) {
                    // [Fail Fast] 파일 존재 여부 확인 (Lenient Policy)
                    const validImages: string[] = [];
                    for (const uri of data.images) {
                        try {
                            const fileInfo = await FileSystem.getInfoAsync(uri);
                            if (fileInfo.exists) {
                                validImages.push(uri);
                            } else {
                                console.warn(`[FailFast] Missing file detected, skipping: ${uri}`);
                            }
                        } catch (e) {
                            console.warn(`[FailFast] Error checking file ${uri}:`, e);
                        }
                    }

                    const formData = new FormData();
                    formData.append('title', data.title);
                    formData.append('content', data.content);
                    if (data.emotion) formData.append('emotion', data.emotion);
                    if (data.weather) formData.append('weather', data.weather);

                    // 유효한 이미지만 업로드
                    validImages.forEach((imageUri: string) => {
                        const filename = imageUri.split('/').pop() || 'image.jpg';
                        const match = /\.(\w+)$/.exec(filename);
                        const type = match ? `image/${match[1]}` : 'image/jpeg';

                        // React Native FormData format
                        formData.append('images', { uri: imageUri, name: filename, type } as any);
                    });

                    if (__DEV__ && data.images.length !== validImages.length) {
                        console.log(`[OfflineQueue] Partial upload: ${validImages.length}/${data.images.length} images`);
                    }

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
                const { id, ...data } = payload as any;

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
                queueDeleteDiary,
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
