/**
 * API 서비스 테스트
 * 팩토리 함수를 사용하여 mock 데이터 중복 제거
 */
import axios from 'axios';
import { diaryService, Diary } from '../services/api';
import {
    createMockDiary,
    createMockDiaries,
    createMockCalendarResponse,
    createMockReportResponse,
    createMockExportResponse,
} from './helpers/testFactories';

// 전역 mock은 jest.setup.ts에서 설정됨
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('diaryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('should fetch all diaries', async () => {
            const mockDiaries = createMockDiaries(1, { location_name: '집' });
            mockedAxios.get.mockResolvedValueOnce({ data: mockDiaries });

            const result = await diaryService.getAll();

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/');
            expect(result).toEqual(mockDiaries);
        });

        it('should handle error when fetching diaries fails', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

            await expect(diaryService.getAll()).rejects.toThrow('Network Error');
        });
    });

    describe('getById', () => {
        it('should fetch a diary by id', async () => {
            const mockDiary = createMockDiary();
            mockedAxios.get.mockResolvedValueOnce({ data: mockDiary });

            const result = await diaryService.getById(1);

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/1/');
            expect(result).toEqual(mockDiary);
        });
    });

    describe('create', () => {
        it('should create a new diary', async () => {
            const newDiary = {
                title: '새 일기',
                content: '오늘 새로운 일기를 작성합니다',
                location_name: '카페',
            };

            const mockResponse = createMockDiary({
                id: 2,
                ...newDiary,
                emotion: 'peaceful',
                emotion_score: 70,
                emotion_emoji: '😌',
            });

            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

            const result = await diaryService.create(newDiary);

            expect(mockedAxios.post).toHaveBeenCalledWith('/api/diaries/', newDiary);
            expect(result).toEqual(mockResponse);
        });
    });

    describe('delete', () => {
        it('should delete a diary', async () => {
            mockedAxios.delete.mockResolvedValueOnce({});

            await diaryService.delete(1);

            expect(mockedAxios.delete).toHaveBeenCalledWith('/api/diaries/1/');
        });
    });

    describe('getCalendar', () => {
        it('should fetch calendar data for a month', async () => {
            const mockCalendar = createMockCalendarResponse(2024, 12);
            mockedAxios.get.mockResolvedValueOnce({ data: mockCalendar });

            const result = await diaryService.getCalendar(2024, 12);

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/calendar/?year=2024&month=12');
            expect(result).toEqual(mockCalendar);
        });
    });

    describe('getReport', () => {
        it('should fetch weekly report', async () => {
            const mockReport = createMockReportResponse('week');
            mockedAxios.get.mockResolvedValueOnce({ data: mockReport });

            const result = await diaryService.getReport('week');

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/report/?period=week');
            expect(result).toEqual(mockReport);
        });
    });

    describe('exportDiaries', () => {
        it('should export all diaries', async () => {
            const mockExport = createMockExportResponse();
            mockedAxios.get.mockResolvedValueOnce({ data: mockExport });

            const result = await diaryService.exportDiaries();

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/export/');
            expect(result).toEqual(mockExport);
        });
    });
});
