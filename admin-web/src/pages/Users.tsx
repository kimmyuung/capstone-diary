import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    InputAdornment,
    Switch,
    CircularProgress
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface User {
    id: number;
    username: string;
    email: string;
    diary_count: number;
    date_joined: string;
    is_active: boolean;
    is_premium: boolean;
    is_superuser: boolean;
}

interface UsersResponse {
    users: User[];
    total: number;
}

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get<UsersResponse>('/admin/users/', {
                params: {
                    page: page + 1,
                    limit: rowsPerPage,
                    search: search
                }
            });
            setUsers(response.data.users);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, rowsPerPage, search]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleStatusChange = async (userId: number, field: 'is_active' | 'is_premium', value: boolean) => {
        try {
            await axios.patch(`/admin/users/${userId}/`, {
                [field]: value
            });
            // 낙관적 업데이트
            setUsers(users.map(user =>
                user.id === userId ? { ...user, [field]: value } : user
            ));
        } catch (error) {
            console.error('Failed to update user status', error);
            fetchUsers(); // 실패 시 롤백을 위해 다시 로드
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                사용자 관리
            </Typography>

            <Paper sx={{ mb: 3, p: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="사용자 이름 또는 이메일 검색"
                    value={search}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            <TableContainer component={Paper}>
                {loading && <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress /></Box>}
                <Table sx={{ minWidth: 650 }} aria-label="user table">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>사용자명</TableCell>
                            <TableCell>이메일</TableCell>
                            <TableCell align="center">일기 수</TableCell>
                            <TableCell align="center">가입일</TableCell>
                            <TableCell align="center">활성 상태</TableCell>
                            <TableCell align="center">프리미엄</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>{user.id}</TableCell>
                                <TableCell sx={{ fontWeight: 'medium' }}>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell align="center">{user.diary_count}</TableCell>
                                <TableCell align="center">{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                                <TableCell align="center">
                                    <Switch
                                        checked={user.is_active}
                                        onChange={(e) => handleStatusChange(user.id, 'is_active', e.target.checked)}
                                        color="primary"
                                        disabled={user.is_superuser}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Switch
                                        checked={user.is_premium}
                                        onChange={(e) => handleStatusChange(user.id, 'is_premium', e.target.checked)}
                                        color="secondary"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    검색 결과가 없습니다.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </Box>
    );
};

export default Users;
