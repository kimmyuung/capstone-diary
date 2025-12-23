/**
 * OfflineBanner 컴포넌트 테스트
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Mock OfflineQueueContext - 컴포넌트가 실제 사용하는 값으로 mock
jest.mock('@/contexts/OfflineQueueContext', () => ({
    useOfflineQueue: () => ({
        isOffline: true,  // 오프라인 상태
        pendingRequests: [],  // 대기 중인 요청 없음
        isSyncing: false,
        queueRequest: jest.fn(),
        removeRequest: jest.fn(),
    }),
}));

import { OfflineBanner } from '@/components/OfflineBanner';

describe('OfflineBanner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('렌더링', () => {
        it('오프라인 상태에서 배너 표시', () => {
            const { getByText } = render(<OfflineBanner />);

            expect(getByText('오프라인 상태')).toBeTruthy();
        });

        it('오프라인 아이콘 표시', () => {
            const { getByText } = render(<OfflineBanner />);

            // 📡 아이콘이 표시됨
            expect(getByText('📡')).toBeTruthy();
        });
    });
});


