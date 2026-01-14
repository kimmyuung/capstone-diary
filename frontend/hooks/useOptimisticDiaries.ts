import { useState, useCallback, useEffect } from 'react';
import { Diary, diaryService } from '@/services/api';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

/**
 * Optimistic Diary List Hook (Refactored with TanStack Query)
 * 
 * - Fetches real data from server using React Query
 * - Merges with pending offline requests
 * - Provides immediate feedback for Create/Update/Delete actions
 */
export const useOptimisticDiaries = () => {
    // Search State for Query Key
    const [searchParams, setSearchParams] = useState<any>(undefined);

    // 1. TanStack Query Integration
    const {
        data: serverDiaries = [],
        isLoading,
        isRefetching,
        refetch
    } = useQuery({
        queryKey: ['diaries', searchParams],
        queryFn: async () => {
            if (searchParams && Object.keys(searchParams).length > 0) {
                return await diaryService.search(searchParams);
            }
            return await diaryService.getAll();
        },
    });

    // 2. Offline Queue Context
    const { pendingRequests, isSyncing } = useOfflineQueue();

    // 3. Merged State (Displayed to user)
    const [displayedDiaries, setDisplayedDiaries] = useState<Diary[]>([]);

    // Refresh function (Pull-to-refresh)
    const refresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    // Search function
    const searchDiaries = useCallback((filters?: any) => {
        setSearchParams(filters);
    }, []);

    // Refetch on Focus (Screen active)
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // Merge Logic (Server + Offline)
    useEffect(() => {
        let merged = [...serverDiaries];

        // Apply pending changes optimistically
        pendingRequests.forEach(req => {
            if (req.type === 'CREATE_DIARY') {
                const payload = req.payload as any;
                // Create temp diary object
                const tempDiary: Diary = {
                    id: payload.id ? Number(payload.id) : Date.now(), // Use temp ID if available
                    title: payload.title,
                    content: payload.content,
                    emotion: payload.emotion || null,
                    emotion_emoji: null, // Default
                    images: payload.images ? payload.images.map((uri: string, index: number) => ({
                        id: Date.now() + index,
                        image_url: uri,
                        ai_prompt: '',
                        created_at: new Date().toISOString()
                    })) : [],
                    tags: [], // Default empty tags
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user: 0, // Placeholder
                    emotion_score: null,
                    emotion_analyzed_at: null,
                    location_name: payload.location_name || null,
                    latitude: null,
                    longitude: null,
                    reflection_question: null,
                    reflection_answer: null,
                    voice_file: null,
                    transcription: null,
                    is_transcribing: false,
                    isSyncing: true, // Marker for UI
                };
                // Add to top
                merged.unshift(tempDiary);
            }

            if (req.type === 'UPDATE_DIARY') {
                const payload = req.payload as any;
                const index = merged.findIndex(d => d.id === payload.id);
                if (index !== -1) {
                    // Update existing item
                    merged[index] = {
                        ...merged[index],
                        ...payload,
                        isSyncing: true,
                        // If updating images, simple replacement for preview
                        images: payload.images ? payload.images.map((uri: string, index: number) => ({
                            id: Date.now() + index,
                            image_url: uri,
                            ai_prompt: '',
                            created_at: new Date().toISOString()
                        })) : merged[index].images
                    };
                }
            }

            if (req.type === 'DELETE_DIARY') {
                const payload = req.payload as any;
                // Remove from list
                merged = merged.filter(d => d.id !== payload.id);
            }
        });

        setDisplayedDiaries(merged);
    }, [serverDiaries, pendingRequests]);

    return {
        diaries: displayedDiaries,
        isLoading,
        isRefreshing: isRefetching,
        isSyncing,
        refresh,
        searchDiaries
    };
};
