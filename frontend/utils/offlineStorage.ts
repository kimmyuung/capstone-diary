/**
 * 오프라인 큐 저장소
 * 
 * AsyncStorage를 사용하여 오프라인 요청을 저장하고 관리합니다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = '@offline_queue';

/**
 * 오프라인 요청 타입
 */
export interface OfflineRequest {
    id: string;
    type: 'CREATE_DIARY' | 'UPDATE_DIARY' | 'DELETE_DIARY' | 'CREATE_TAG';
    payload: unknown;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
}

/**
 * 고유 ID 생성
 */
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 오프라인 요청 큐 관리
 */
export const offlineStorage = {
    /**
     * 모든 대기 중인 요청 조회
     */
    async getQueue(): Promise<OfflineRequest[]> {
        try {
            const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[OfflineStorage] Failed to get queue:', error);
            return [];
        }
    },

    /**
     * 요청 추가
     */
    async addRequest(
        type: OfflineRequest['type'],
        payload: unknown,
        maxRetries: number = 3
    ): Promise<OfflineRequest> {
        const request: OfflineRequest = {
            id: generateId(),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries,
        };

        const queue = await this.getQueue();
        queue.push(request);

        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

        if (__DEV__) {
            console.log(`[OfflineStorage] Request added:`, request.type, request.id);
        }

        return request;
    },

    /**
     * 요청 제거
     */
    async removeRequest(id: string): Promise<void> {
        const queue = await this.getQueue();
        const filtered = queue.filter(req => req.id !== id);
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));

        if (__DEV__) {
            console.log(`[OfflineStorage] Request removed:`, id);
        }
    },

    /**
     * 재시도 횟수 증가
     */
    async incrementRetry(id: string): Promise<OfflineRequest | null> {
        const queue = await this.getQueue();
        const index = queue.findIndex(req => req.id === id);

        if (index === -1) return null;

        queue[index].retryCount += 1;

        // 최대 재시도 횟수 초과 시 제거
        if (queue[index].retryCount > queue[index].maxRetries) {
            console.warn(`[OfflineStorage] Max retries exceeded, removing:`, id);
            await this.removeRequest(id);
            return null;
        }

        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        return queue[index];
    },

    /**
     * 큐 전체 삭제
     */
    async clearQueue(): Promise<void> {
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);

        if (__DEV__) {
            console.log(`[OfflineStorage] Queue cleared`);
        }
    },

    /**
     * 대기 중인 요청 수
     */
    async getQueueLength(): Promise<number> {
        const queue = await this.getQueue();
        return queue.length;
    },
};
