import { useState, useCallback, useEffect } from 'react';
import { Diary, diaryService } from '@/services/api';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { useFocusEffect } from 'expo-router';

/**
 * Optimistic Diary List Hook
 * 
 * - Fetches real data from server
 * - Merges with pending offline requests
 * - Provides immediate feedback for Create/Update/Delete actions
 */
export const useOptimisticDiaries = () => {
    const [serverDiaries, setServerDiaries] = useState<Diary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Offline Queue Context
    const { pendingRequests, isSyncing } = useOfflineQueue();

    // displayedDiaries: Final list shown to user
    const [displayedDiaries, setDisplayedDiaries] = useState<Diary[]>([]);

    const fetchDiaries = useCallback(async () => {
        try {
            const data = await diaryService.getAll();
            setServerDiaries(data);
        } catch (error) {
            console.error('Failed to fetch diaries:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial fetch & Refresh when screen focuses
    useFocusEffect(
        useCallback(() => {
            fetchDiaries();
        }, [fetchDiaries])
    );

    const refresh = async () => {
        setIsRefreshing(true);
        await fetchDiaries();
    };

    // Merge Server Data + Pending Requests
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
                    images: payload.images ? payload.images.map((uri: string, index: number) => ({
                        id: Date.now() + index,
                        image_url: uri,
                        ai_prompt: '',
                        created_at: new Date().toISOString()
                    })) : [],
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
        isRefreshing,
        isSyncing,
        refresh
    };
};
