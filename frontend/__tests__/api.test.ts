/**
 * API 서비스 테스트
 */
import axios from 'axios';
import { diaryService, Diary } from '../services/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create
mockedAxios.create = jest.fn(() => mockedAxios);

describe('diaryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('should fetch all diaries', async () => {
            const mockDiaries: Diary[] = [
                {
                    id: 1,
                    user: 1,
                    title: '테스트 일기',
                    content: '오늘 하루는 좋았다',
                    images: [],
                    emotion: 'happy',
                    emotion_score: 85,
                    emotion_emoji: '😊',
                    emotion_analyzed_at: '2024-12-21T10:00:00Z',
                    location_name: '집',
                    latitude: null,
                    longitude: null,
                    created_at: '2024-12-21T10:00:00Z',
                    updated_at: '2024-12-21T10:00:00Z',
                },
            ];

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
            const mockDiary: Diary = {
                id: 1,
                user: 1,
                title: '테스트 일기',
                content: '오늘 하루는 좋았다',
                images: [],
                emotion: 'happy',
                emotion_score: 85,
                emotion_emoji: '😊',
                emotion_analyzed_at: '2024-12-21T10:00:00Z',
                location_name: null,
                latitude: null,
                longitude: null,
                created_at: '2024-12-21T10:00:00Z',
                updated_at: '2024-12-21T10:00:00Z',
            };

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

            const mockResponse: Diary = {
                id: 2,
                user: 1,
                ...newDiary,
                images: [],
                emotion: 'peaceful',
                emotion_score: 70,
                emotion_emoji: '😌',
                emotion_analyzed_at: '2024-12-21T11:00:00Z',
                latitude: null,
                longitude: null,
                created_at: '2024-12-21T11:00:00Z',
                updated_at: '2024-12-21T11:00:00Z',
            };

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

    describe('search', () => {
        it('should search diaries with keyword', async () => {
            const mockDiaries: Diary[] = [];
            mockedAxios.get.mockResolvedValueOnce({ data: mockDiaries });

            await diaryService.search({ keyword: '행복' });

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/', {
                params: { keyword: '행복' },
            });
        });

        it('should search diaries with emotion filter', async () => {
            const mockDiaries: Diary[] = [];
            mockedAxios.get.mockResolvedValueOnce({ data: mockDiaries });

            await diaryService.search({ emotion: 'happy' });

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/', {
                params: { emotion: 'happy' },
            });
        });
    });

    describe('getCalendar', () => {
        it('should fetch calendar data for a month', async () => {
            const mockCalendar = {
                year: 2024,
                month: 12,
                days: {
                    '2024-12-01': { count: 1, emotion: 'happy', emoji: '😊', diary_ids: [1] },
                },
            };

            mockedAxios.get.mockResolvedValueOnce({ data: mockCalendar });

            const result = await diaryService.getCalendar(2024, 12);

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/calendar/?year=2024&month=12');
            expect(result).toEqual(mockCalendar);
        });
    });

    describe('getReport', () => {
        it('should fetch weekly report', async () => {
            const mockReport = {
                period: 'week',
                total_diaries: 5,
                emotion_stats: [],
            };

            mockedAxios.get.mockResolvedValueOnce({ data: mockReport });

            const result = await diaryService.getReport('week');

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/report/?period=week');
            expect(result).toEqual(mockReport);
        });
    });

    describe('exportDiaries', () => {
        it('should export all diaries', async () => {
            const mockExport = {
                exported_at: '2024-12-21T12:00:00Z',
                total_diaries: 10,
                diaries: [],
            };

            mockedAxios.get.mockResolvedValueOnce({ data: mockExport });

            const result = await diaryService.exportDiaries();

            expect(mockedAxios.get).toHaveBeenCalledWith('/api/diaries/export/');
            expect(result).toEqual(mockExport);
        });
    });
});
