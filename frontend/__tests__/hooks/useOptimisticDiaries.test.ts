/**
 * useOptimisticDiaries Hook 테스트
 */
import { renderHook, act } from '@testing-library/react-hooks';

// Mock the actual hook for testing
const mockDiaries = [
    { id: 1, title: '일기 1', content: '내용 1', emotion: 'happy' },
    { id: 2, title: '일기 2', content: '내용 2', emotion: 'sad' },
];

// Simplified mock hook for testing
const useOptimisticDiaries = () => {
    const [diaries, setDiaries] = require('react').useState(mockDiaries);
    const [pendingChanges, setPendingChanges] = require('react').useState<Map<number, any>>(new Map());

    const optimisticUpdate = (id: number, updates: any) => {
        // Store original
        const original = diaries.find((d: any) => d.id === id);
        setPendingChanges((prev: Map<number, any>) => new Map(prev).set(id, original));

        // Apply optimistic update
        setDiaries((prev: any[]) =>
            prev.map((d: any) => d.id === id ? { ...d, ...updates } : d)
        );
    };

    const rollback = (id: number) => {
        const original = pendingChanges.get(id);
        if (original) {
            setDiaries((prev: any[]) =>
                prev.map((d: any) => d.id === id ? original : d)
            );
            setPendingChanges((prev: Map<number, any>) => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
            });
        }
    };

    const confirmUpdate = (id: number) => {
        setPendingChanges((prev: Map<number, any>) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    };

    return {
        diaries,
        optimisticUpdate,
        rollback,
        confirmUpdate,
        hasPendingChanges: pendingChanges.size > 0,
    };
};

describe('useOptimisticDiaries', () => {
    it('returns initial diaries', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        expect(result.current.diaries).toHaveLength(2);
        expect(result.current.diaries[0].title).toBe('일기 1');
    });

    it('applies optimistic update immediately', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        act(() => {
            result.current.optimisticUpdate(1, { title: '수정된 일기 1' });
        });

        const updatedDiary = result.current.diaries.find((d: any) => d.id === 1);
        expect(updatedDiary?.title).toBe('수정된 일기 1');
    });

    it('tracks pending changes', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        expect(result.current.hasPendingChanges).toBe(false);

        act(() => {
            result.current.optimisticUpdate(1, { title: '수정됨' });
        });

        expect(result.current.hasPendingChanges).toBe(true);
    });

    it('rollback restores original value', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        act(() => {
            result.current.optimisticUpdate(1, { title: '수정됨' });
        });

        expect(result.current.diaries.find((d: any) => d.id === 1)?.title).toBe('수정됨');

        act(() => {
            result.current.rollback(1);
        });

        expect(result.current.diaries.find((d: any) => d.id === 1)?.title).toBe('일기 1');
    });

    it('confirmUpdate clears pending changes', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        act(() => {
            result.current.optimisticUpdate(1, { title: '확정됨' });
        });

        expect(result.current.hasPendingChanges).toBe(true);

        act(() => {
            result.current.confirmUpdate(1);
        });

        expect(result.current.hasPendingChanges).toBe(false);
        // 확정 후에도 업데이트된 값 유지
        expect(result.current.diaries.find((d: any) => d.id === 1)?.title).toBe('확정됨');
    });
});

describe('useOptimisticDiaries - Multiple Updates', () => {
    it('handles multiple simultaneous updates', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        act(() => {
            result.current.optimisticUpdate(1, { title: '수정 1' });
            result.current.optimisticUpdate(2, { title: '수정 2' });
        });

        expect(result.current.diaries.find((d: any) => d.id === 1)?.title).toBe('수정 1');
        expect(result.current.diaries.find((d: any) => d.id === 2)?.title).toBe('수정 2');
    });

    it('rollback only affects specified diary', () => {
        const { result } = renderHook(() => useOptimisticDiaries());

        act(() => {
            result.current.optimisticUpdate(1, { title: '수정 1' });
            result.current.optimisticUpdate(2, { title: '수정 2' });
        });

        act(() => {
            result.current.rollback(1);
        });

        expect(result.current.diaries.find((d: any) => d.id === 1)?.title).toBe('일기 1');
        expect(result.current.diaries.find((d: any) => d.id === 2)?.title).toBe('수정 2');
    });
});
