import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { StatsData } from '../types/api';

export const useStats = () => {
    return useQuery<StatsData>({
        queryKey: ['stats'],
        queryFn: async () => {
            const { data } = await axios.get<StatsData>('/admin/stats/');
            return data;
        },
    });
};
