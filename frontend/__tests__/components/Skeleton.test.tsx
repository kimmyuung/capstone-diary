/**
 * Skeleton 컴포넌트 테스트
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import {
    Skeleton,
    DiaryCardSkeleton,
    DiaryListSkeleton,
    GalleryGridSkeleton,
    ReportSkeleton,
    CalendarSkeleton,
} from '@/components/Skeleton';

describe('Skeleton Components', () => {
    describe('Skeleton (Base)', () => {
        it('renders with default props', () => {
            const { getByTestId } = render(<Skeleton />);
            expect(getByTestId('skeleton')).toBeTruthy();
        });

        it('renders with custom dimensions', () => {
            const { getByTestId } = render(
                <Skeleton width={200} height={50} />
            );
            const skeleton = getByTestId('skeleton');
            expect(skeleton.props.style).toMatchObject({
                width: 200,
                height: 50,
            });
        });

        it('renders with custom border radius', () => {
            const { getByTestId } = render(
                <Skeleton borderRadius={20} />
            );
            const skeleton = getByTestId('skeleton');
            expect(skeleton.props.style.borderRadius).toBe(20);
        });
    });

    describe('DiaryCardSkeleton', () => {
        it('renders diary card skeleton structure', () => {
            const { getAllByTestId } = render(<DiaryCardSkeleton />);
            // 여러 skeleton 요소가 있어야 함
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(1);
        });
    });

    describe('DiaryListSkeleton', () => {
        it('renders default 3 skeleton cards', () => {
            const { getAllByTestId } = render(<DiaryListSkeleton />);
            // 3개의 DiaryCardSkeleton이 렌더링되어야 함
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(3);
        });

        it('renders specified number of skeleton cards', () => {
            const { getAllByTestId } = render(<DiaryListSkeleton count={5} />);
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(5);
        });
    });

    describe('GalleryGridSkeleton', () => {
        it('renders gallery grid skeleton', () => {
            const { getAllByTestId } = render(<GalleryGridSkeleton />);
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });

        it('renders specified number of images', () => {
            const { getAllByTestId } = render(<GalleryGridSkeleton count={6} />);
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBe(6);
        });
    });

    describe('ReportSkeleton', () => {
        it('renders report skeleton structure', () => {
            const { getAllByTestId } = render(<ReportSkeleton />);
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(3);
        });
    });

    describe('CalendarSkeleton', () => {
        it('renders calendar skeleton structure', () => {
            const { getAllByTestId } = render(<CalendarSkeleton />);
            const skeletons = getAllByTestId('skeleton');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });
});
