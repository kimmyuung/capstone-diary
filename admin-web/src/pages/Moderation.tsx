import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid
} from '@mui/material';
import { Warning as WarningIcon, Report as ReportIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface ModerationItemData {
    id: number;
    type: 'flag' | 'report';
    diary_id: number;
    diary_title: string;
    username: string;
    confidence: number;
    keywords: string[];
    flag_type_display?: string;
    reason_display?: string;
    description?: string;
    detected_at?: string;
    created_at?: string;
}

interface ModerationItemProps {
    item: ModerationItemData;
    onAction: (item: ModerationItemData, action: string) => void;
}

interface ActionDialogState {
    open: boolean;
    item: ModerationItemData | null;
    action: string;
}

const ModerationItem: React.FC<ModerationItemProps> = ({ item, onAction }) => {
    const isFlag = item.type === 'flag';

    return (
        <Card sx={{ mb: 2, border: item.confidence >= 0.9 ? '1px solid #d32f2f' : '1px solid #e0e0e0' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                        icon={isFlag ? <WarningIcon /> : <ReportIcon />}
                        label={isFlag ? item.flag_type_display : item.reason_display}
                        color={isFlag ? "warning" : "error"}
                        variant="outlined"
                        size="small"
                    />
                    <Typography variant="caption" color="textSecondary">
                        {new Date(item.detected_at || item.created_at || '').toLocaleString()}
                    </Typography>
                </Box>

                <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
                    {item.diary_title}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    작성자: {item.username} / ID: {item.diary_id}
                </Typography>

                {isFlag && (
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2">
                            <strong>신뢰도:</strong> {(item.confidence * 100).toFixed(0)}%
                        </Typography>
                        <Typography variant="body2">
                            <strong>감지된 키워드:</strong> {item.keywords.join(', ') || '없음'}
                        </Typography>
                    </Box>
                )}

                {!isFlag && (
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>신고 내용:</Typography>
                        <Typography variant="body2">{item.description || '내용 없음'}</Typography>
                    </Box>
                )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end', bgcolor: '#fafafa' }}>
                <Button size="small" onClick={() => onAction(item, 'none')}>무시</Button>
                <Button size="small" color="warning" onClick={() => onAction(item, 'warning')}>경고</Button>
                <Button size="small" color="error" onClick={() => onAction(item, 'deleted')}>삭제</Button>
            </CardActions>
        </Card>
    );
};

const Moderation: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [items, setItems] = useState<ModerationItemData[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionDialog, setActionDialog] = useState<ActionDialogState>({ open: false, item: null, action: '' });
    const [notes, setNotes] = useState('');

    const fetchItems = async () => {
        setLoading(true);
        try {
            const type = tabValue === 0 ? 'flags' : 'reports';
            const response = await axios.get<{ items: ModerationItemData[] }>('/admin/moderation/', {
                params: { type, status: 'pending' }
            });
            setItems(response.data.items);
        } catch (error) {
            console.error('Failed to fetch moderation items', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [tabValue]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleActionClick = (item: ModerationItemData, action: string) => {
        setActionDialog({ open: true, item, action });
    };

    const handleActionConfirm = async () => {
        const { item, action } = actionDialog;
        if (!item) return;

        try {
            await axios.patch(`/admin/moderation/${item.id}/`, {
                type: item.type,
                action: action,
                notes: notes
            });

            // 목록에서 제거
            setItems(items.filter(i => i.id !== item.id));
            handleCloseDialog();
        } catch (error) {
            console.error('Action failed', error);
        }
    };

    const handleCloseDialog = () => {
        setActionDialog({ open: false, item: null, action: '' });
        setNotes('');
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                콘텐츠 모더레이션
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
                    <Tab label="자동 감지됨" />
                    <Tab label="사용자 신고" />
                </Tabs>
            </Paper>

            <Grid container spacing={2}>
                {items.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                        <ModerationItem item={item} onAction={handleActionClick} />
                    </Grid>
                ))}
                {items.length === 0 && !loading && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 5, textAlign: 'center' }}>
                            <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                            <Typography variant="h6">처리할 항목이 없습니다.</Typography>
                            <Typography color="textSecondary">모든 콘텐츠가 안전합니다.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            <Dialog open={actionDialog.open} onClose={handleCloseDialog}>
                <DialogTitle>처리 확인</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        다음 조치를 수행하시겠습니까? <strong>{actionDialog.action}</strong>
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="관리자 메모 (선택사항)"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={notes}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>취소</Button>
                    <Button onClick={handleActionConfirm} variant="contained" color="primary">
                        확인
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Moderation;
