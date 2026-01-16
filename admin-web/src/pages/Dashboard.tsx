import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    CircularProgress
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    People as PeopleIcon,
    Book as BookIcon,
    Image as ImageIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

interface StatCardProps {
    title: string;
    value: number;
    subValue?: string;
    icon: React.ReactElement;
    color: string;
}

interface StatsData {
    users: {
        total: number;
        new_this_week: number;
    };
    diaries: {
        total: number;
        this_week: number;
    };
    ai_images: {
        total: number;
        this_week: number;
    };
    moderation: {
        pending_flags: number;
        pending_reports: number;
    };
    emotions: {
        distribution: Record<string, number>;
    };
    trends?: {
        daily: Array<{ date: string; diaries: number; users: number }>;
    };
}

interface EmotionDataItem {
    name: string;
    value: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon, color }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography color="textSecondary" gutterBottom variant="subtitle2">
                        {title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {value.toLocaleString()}
                    </Typography>
                    {subValue && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            {subValue}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ bgcolor: `${color}20`, p: 1, borderRadius: 1 }}>
                    {React.cloneElement(icon, { sx: { color: color } })}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get<StatsData>('/admin/stats/');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!stats) return <Typography>데이터를 불러올 수 없습니다.</Typography>;

    // 차트 데이터 변환
    const trendData = stats.trends?.daily || [];

    // 감정 분포 데이터
    const emotionData: EmotionDataItem[] = Object.entries(stats.emotions.distribution || {}).map(([name, value]) => ({
        name,
        value
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                대시보드
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="총 사용자"
                        value={stats.users.total}
                        subValue={`이번 주 신규: ${stats.users.new_this_week}명`}
                        icon={<PeopleIcon />}
                        color="#1976d2"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="총 일기"
                        value={stats.diaries.total}
                        subValue={`이번 주 작성: ${stats.diaries.this_week}개`}
                        icon={<BookIcon />}
                        color="#2e7d32"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="AI 이미지 생성"
                        value={stats.ai_images.total}
                        subValue={`이번 주 생성: ${stats.ai_images.this_week}장`}
                        icon={<ImageIcon />}
                        color="#9c27b0"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="모더레이션 요청"
                        value={stats.moderation.pending_flags + stats.moderation.pending_reports}
                        subValue={`자동감지: ${stats.moderation.pending_flags} / 신고: ${stats.moderation.pending_reports}`}
                        icon={<WarningIcon />}
                        color="#ed6c02"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom>주간 활동 추이</Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Line yAxisId="left" type="monotone" dataKey="diaries" name="일기" stroke="#8884d8" activeDot={{ r: 8 }} />
                                <Line yAxisId="right" type="monotone" dataKey="users" name="신규 가입" stroke="#82ca9d" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom>감정 분포</Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={emotionData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {emotionData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
