/**
 * 위치 수집 훅
 * 
 * expo-location을 사용하여 현재 위치의 GPS 좌표를 수집합니다.
 * 웹과 네이티브 환경 모두 지원합니다.
 */
import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';

export interface LocationData {
    /** 위도 */
    latitude: number;
    /** 경도 */
    longitude: number;
    /** 위치명 (역지오코딩 결과) */
    locationName: string | null;
}

export interface UseLocationReturn {
    /** 현재 위치 데이터 */
    location: LocationData | null;
    /** 위치 수집 중인지 */
    isLoading: boolean;
    /** 에러 메시지 */
    error: string | null;
    /** 현재 위치 요청 */
    requestLocation: () => Promise<LocationData | null>;
    /** 위치 초기화 */
    clearLocation: () => void;
    /** 위치명만 직접 설정 */
    setLocationName: (name: string) => void;
}

/**
 * 위치 수집 훅
 * 
 * @example
 * const { location, isLoading, requestLocation } = useLocation();
 * 
 * // 버튼 클릭 시 위치 수집
 * <Button onPress={requestLocation} disabled={isLoading}>
 *   현재 위치 사용
 * </Button>
 */
export function useLocation(): UseLocationReturn {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 현재 위치 요청
     */
    const requestLocation = useCallback(async (): Promise<LocationData | null> => {
        setIsLoading(true);
        setError(null);

        try {
            // 권한 요청
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                const errorMsg = '위치 권한이 허용되지 않았습니다';
                setError(errorMsg);

                // 네이티브 환경에서는 설정으로 안내
                if (Platform.OS !== 'web') {
                    Alert.alert(
                        '위치 권한 필요',
                        '위치 정보를 사용하려면 설정에서 권한을 허용해주세요.',
                        [{ text: '확인' }]
                    );
                }

                setIsLoading(false);
                return null;
            }

            // 현재 위치 수집
            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = position.coords;

            // 역지오코딩 시도 (주소 가져오기)
            let locationName: string | null = null;
            try {
                const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (address) {
                    // 주소 조합 (도시명 + 지역명 또는 도로명)
                    const parts = [
                        address.city || address.region,
                        address.district || address.subregion || address.street,
                    ].filter(Boolean);
                    locationName = parts.join(' ') || null;
                }
            } catch (geocodeError) {
                // 역지오코딩 실패해도 좌표는 사용 가능
                if (__DEV__) {
                    console.log('[useLocation] Reverse geocoding failed:', geocodeError);
                }
            }

            const locationData: LocationData = {
                latitude,
                longitude,
                locationName,
            };

            setLocation(locationData);
            setIsLoading(false);
            return locationData;

        } catch (err) {
            const errorMsg = '위치를 가져올 수 없습니다';
            setError(errorMsg);
            setIsLoading(false);

            if (__DEV__) {
                console.error('[useLocation] Error:', err);
            }

            return null;
        }
    }, []);

    /**
     * 위치 초기화
     */
    const clearLocation = useCallback(() => {
        setLocation(null);
        setError(null);
    }, []);

    /**
     * 위치명만 직접 설정 (카테고리 선택 시 사용)
     */
    const setLocationNameOnly = useCallback((name: string) => {
        if (location) {
            setLocation({ ...location, locationName: name });
        } else {
            // 좌표 없이 위치명만 저장
            setLocation({
                latitude: 0,
                longitude: 0,
                locationName: name,
            });
        }
    }, [location]);

    return {
        location,
        isLoading,
        error,
        requestLocation,
        clearLocation,
        setLocationName: setLocationNameOnly,
    };
}

export default useLocation;
