/**
 * useFormErrors 훅 테스트
 */
import { renderHook, act } from '@testing-library/react-native';

// errorHandler mock
jest.mock('@/utils/errorHandler', () => ({
    getValidationErrors: jest.fn((error: any) => {
        if (error?.response?.data?.details) {
            const details = error.response.data.details;
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(details)) {
                result[key] = Array.isArray(value) ? value[0] : value as string;
            }
            return result;
        }
        return null;
    }),
    formatValidationErrors: jest.fn(),
    getErrorMessage: jest.fn(() => '알 수 없는 오류'),
    isNetworkError: jest.fn(() => false),
}));

import { useFormErrors } from '@/hooks/useFormErrors';

describe('useFormErrors', () => {
    describe('초기 상태', () => {
        it('초기 에러 상태가 빈 객체임', () => {
            const { result } = renderHook(() => useFormErrors());

            expect(result.current.errors).toEqual({});
            expect(result.current.hasErrors).toBe(false);
        });
    });

    describe('setFieldError', () => {
        it('필드 에러 설정', () => {
            const { result } = renderHook(() => useFormErrors());

            act(() => {
                result.current.setFieldError('title', '제목을 입력해주세요');
            });

            expect(result.current.errors.title).toBe('제목을 입력해주세요');
            expect(result.current.hasErrors).toBe(true);
        });

        it('여러 필드 에러 설정', () => {
            const { result } = renderHook(() => useFormErrors());

            act(() => {
                result.current.setFieldError('title', '제목을 입력해주세요');
                result.current.setFieldError('content', '내용을 입력해주세요');
            });

            expect(result.current.errors.title).toBe('제목을 입력해주세요');
            expect(result.current.errors.content).toBe('내용을 입력해주세요');
        });
    });

    describe('clearFieldError', () => {
        it('특정 필드 에러 제거', () => {
            const { result } = renderHook(() => useFormErrors());

            act(() => {
                result.current.setFieldError('title', '제목을 입력해주세요');
                result.current.setFieldError('content', '내용을 입력해주세요');
            });

            act(() => {
                result.current.clearFieldError('title');
            });

            expect(result.current.errors.title).toBeUndefined();
            expect(result.current.errors.content).toBe('내용을 입력해주세요');
        });
    });

    describe('clearAllErrors', () => {
        it('모든 에러 제거', () => {
            const { result } = renderHook(() => useFormErrors());

            act(() => {
                result.current.setFieldError('title', '제목을 입력해주세요');
                result.current.setFieldError('content', '내용을 입력해주세요');
            });

            expect(result.current.hasErrors).toBe(true);

            act(() => {
                result.current.clearAllErrors();
            });

            expect(result.current.errors).toEqual({});
            expect(result.current.hasErrors).toBe(false);
        });
    });

    describe('setErrorsFromResponse', () => {
        it('API 에러 응답에서 필드 에러 추출', () => {
            const { result } = renderHook(() => useFormErrors());

            const mockError = {
                response: {
                    data: {
                        code: 'VALIDATION_ERROR',
                        details: {
                            title: ['제목은 필수입니다'],
                            content: ['내용은 200자 이상이어야 합니다'],
                        },
                    },
                },
            };

            act(() => {
                result.current.setErrorsFromResponse(mockError);
            });

            expect(result.current.errors.title).toBe('제목은 필수입니다');
            expect(result.current.errors.content).toBe('내용은 200자 이상이어야 합니다');
        });

        it('API 에러에 details가 없으면 무시', () => {
            const { result } = renderHook(() => useFormErrors());

            const mockError = {
                response: {
                    data: {
                        code: 'UNKNOWN_ERROR',
                        message: '알 수 없는 오류',
                    },
                },
            };

            act(() => {
                result.current.setErrorsFromResponse(mockError);
            });

            expect(result.current.errors).toEqual({});
        });

        it('에러 객체가 없으면 무시', () => {
            const { result } = renderHook(() => useFormErrors());

            act(() => {
                result.current.setErrorsFromResponse(null);
            });

            expect(result.current.errors).toEqual({});
        });
    });

    describe('getFieldError', () => {
        it('특정 필드 에러 조회', () => {
            const { result } = renderHook(() => useFormErrors());

            act(() => {
                result.current.setFieldError('title', '제목을 입력해주세요');
            });

            expect(result.current.getFieldError('title')).toBe('제목을 입력해주세요');
            expect(result.current.getFieldError('content')).toBeUndefined();
        });
    });
});
