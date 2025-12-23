/**
 * useLocation 훅 테스트
 */
import { renderHook, act } from '@testing-library/react-native';

// Mock expo-location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
    Accuracy: { Balanced: 3 },
}));

import { useLocation } from '@/hooks/useLocation';
import * as Location from 'expo-location';

describe('useLocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('초기 상태', () => {
        it('초기 상태가 올바름', () => {
            const { result } = renderHook(() => useLocation());

            expect(result.current.location).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('requestLocation', () => {
        it('권한 허용 시 위치 반환', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'granted',
            });
            (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
                coords: { latitude: 37.5665, longitude: 126.9780 },
            });
            (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
                { city: '서울', district: '중구' },
            ]);

            const { result } = renderHook(() => useLocation());

            let locationResult: any;
            await act(async () => {
                locationResult = await result.current.requestLocation();
            });

            expect(locationResult).toEqual({
                latitude: 37.5665,
                longitude: 126.9780,
                locationName: '서울 중구',
            });
            expect(result.current.location).toEqual(locationResult);
        });

        it('권한 거부 시 에러 반환', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'denied',
            });

            const { result } = renderHook(() => useLocation());

            let locationResult: any;
            await act(async () => {
                locationResult = await result.current.requestLocation();
            });

            expect(locationResult).toBeNull();
            expect(result.current.error).toBe('위치 권한이 허용되지 않았습니다');
        });
    });

    describe('clearLocation', () => {
        it('위치 초기화', async () => {
            (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
                status: 'granted',
            });
            (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
                coords: { latitude: 37.5665, longitude: 126.9780 },
            });

            const { result } = renderHook(() => useLocation());

            await act(async () => {
                await result.current.requestLocation();
            });

            expect(result.current.location).not.toBeNull();

            act(() => {
                result.current.clearLocation();
            });

            expect(result.current.location).toBeNull();
        });
    });

    describe('setLocationName', () => {
        it('위치명만 설정 (좌표 없이)', () => {
            const { result } = renderHook(() => useLocation());

            act(() => {
                result.current.setLocationName('카페');
            });

            expect(result.current.location?.locationName).toBe('카페');
        });
    });
});

