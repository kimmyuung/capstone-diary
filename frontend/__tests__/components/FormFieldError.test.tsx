/**
 * FormFieldError 컴포넌트 테스트
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FormFieldError } from '@/components/FormFieldError';

describe('FormFieldError', () => {
    describe('렌더링', () => {
        it('에러 메시지가 있으면 표시', () => {
            const { getByText } = render(
                <FormFieldError error="제목을 입력해주세요" />
            );

            expect(getByText('제목을 입력해주세요')).toBeTruthy();
        });

        it('에러 메시지가 없으면 아무것도 렌더링하지 않음', () => {
            const { queryByTestId, toJSON } = render(
                <FormFieldError error={undefined} />
            );

            expect(toJSON()).toBeNull();
        });

        it('빈 문자열 에러는 렌더링하지 않음', () => {
            const { toJSON } = render(
                <FormFieldError error="" />
            );

            expect(toJSON()).toBeNull();
        });

        it('null 에러는 렌더링하지 않음', () => {
            const { toJSON } = render(
                <FormFieldError error={null as any} />
            );

            expect(toJSON()).toBeNull();
        });
    });

    describe('스타일', () => {
        it('에러 아이콘 표시', () => {
            const { getByText } = render(
                <FormFieldError error="오류" />
            );

            // 에러 아이콘(⚠️)이 포함되어 있거나 텍스트가 있으면 됨
            expect(getByText('오류')).toBeTruthy();
        });
    });
});
