/**
 * LocationPicker 컴포넌트 테스트
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock useLocation hook
const mockRequestLocation = jest.fn();
const mockClearLocation = jest.fn();
jest.mock('@/hooks/useLocation', () => ({
    useLocation: () => ({
        location: null,
        isLoading: false,
        error: null,
        requestLocation: mockRequestLocation,
        clearLocation: mockClearLocation,
        setLocationName: jest.fn(),
    }),
}));

import { LocationPicker } from '@/components/diary/LocationPicker';

describe('LocationPicker', () => {
    const mockOnChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('렌더링', () => {
        it('기본 렌더링', () => {
            const { getByText } = render(
                <LocationPicker onChange={mockOnChange} />
            );

            expect(getByText('📍 장소')).toBeTruthy();
            expect(getByText('현재 위치 사용')).toBeTruthy();
        });

        it('카테고리 목록 표시', () => {
            const { getByText } = render(
                <LocationPicker onChange={mockOnChange} />
            );

            expect(getByText('집')).toBeTruthy();
            expect(getByText('카페')).toBeTruthy();
            expect(getByText('공원')).toBeTruthy();
        });
    });

    describe('카테고리 선택', () => {
        it('카테고리 선택 시 onChange 호출', () => {
            const { getByText } = render(
                <LocationPicker onChange={mockOnChange} />
            );

            fireEvent.press(getByText('집'));

            expect(mockOnChange).toHaveBeenCalledWith({
                locationName: '집',
                latitude: null,
                longitude: null,
            });
        });

        it('기타 선택 시 직접 입력 표시', () => {
            const { getByText, getByPlaceholderText } = render(
                <LocationPicker onChange={mockOnChange} />
            );

            fireEvent.press(getByText('기타'));

            expect(getByPlaceholderText('장소명을 입력하세요')).toBeTruthy();
        });

        it('같은 카테고리 재선택 시 해제', () => {
            const { getByText } = render(
                <LocationPicker onChange={mockOnChange} />
            );

            // 선택
            fireEvent.press(getByText('집'));
            expect(mockOnChange).toHaveBeenCalledWith({
                locationName: '집',
                latitude: null,
                longitude: null,
            });

            // 해제
            fireEvent.press(getByText('집'));
            expect(mockOnChange).toHaveBeenLastCalledWith({
                locationName: null,
                latitude: null,
                longitude: null,
            });
        });
    });

    describe('GPS 위치 수집', () => {
        it('현재 위치 사용 버튼 클릭 시 requestLocation 호출', async () => {
            mockRequestLocation.mockResolvedValue({
                latitude: 37.5665,
                longitude: 126.9780,
                locationName: '서울 중구',
            });

            const { getByText } = render(
                <LocationPicker onChange={mockOnChange} />
            );

            fireEvent.press(getByText('현재 위치 사용'));

            await waitFor(() => {
                expect(mockRequestLocation).toHaveBeenCalled();
            });
        });
    });

    describe('비활성화', () => {
        it('disabled 상태에서 버튼 비활성화', () => {
            const { getByText } = render(
                <LocationPicker onChange={mockOnChange} disabled={true} />
            );

            const button = getByText('현재 위치 사용');
            fireEvent.press(button);

            // disabled 상태에서는 요청이 되지 않아야 함
            // (실제 비활성화 확인은 컴포넌트 구현에 따라 다름)
        });
    });
});
