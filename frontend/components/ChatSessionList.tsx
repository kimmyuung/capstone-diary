import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

interface ChatSession {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    last_message_preview: string | null;
}

interface ChatSessionListProps {
    onSelectSession: (sessionId: number) => void;
    onNewSession: () => void;
    selectedSessionId?: number;
}

export const ChatSessionList: React.FC<ChatSessionListProps> = ({
    onSelectSession,
    onNewSession,
    selectedSessionId,
}) => {
    const { isDark } = useTheme();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = useCallback(async () => {
        try {
            const response = await api.get('/api/chat/sessions/');
            setSessions(response.data.sessions);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleDelete = async (sessionId: number) => {
        Alert.alert(
            '대화 삭제',
            '이 대화를 삭제하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/chat/sessions/${sessionId}/`);
                            setSessions(prev => prev.filter(s => s.id !== sessionId));
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('오류', '삭제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffHrs < 1) return '방금 전';
        if (diffHrs < 24) return `${Math.floor(diffHrs)}시간 전`;
        if (diffHrs < 48) return '어제';
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item }: { item: ChatSession }) => {
        const isSelected = item.id === selectedSessionId;

        return (
            <TouchableOpacity
                style={[
                    styles.sessionItem,
                    isDark && styles.sessionItemDark,
                    isSelected && styles.sessionItemSelected,
                ]}
                onPress={() => onSelectSession(item.id)}
                onLongPress={() => handleDelete(item.id)}
            >
                <View style={styles.sessionIcon}>
                    <IconSymbol name="bubble.left.fill" size={18} color={Palette.primary[500]} />
                </View>
                <View style={styles.sessionContent}>
                    <Text style={[styles.sessionTitle, isDark && styles.textLight]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {item.last_message_preview && (
                        <Text style={[styles.sessionPreview, isDark && styles.textMuted]} numberOfLines={1}>
                            {item.last_message_preview}
                        </Text>
                    )}
                </View>
                <View style={styles.sessionMeta}>
                    <Text style={[styles.sessionDate, isDark && styles.textMuted]}>
                        {formatDate(item.updated_at)}
                    </Text>
                    <Text style={[styles.sessionCount, isDark && styles.textMuted]}>
                        {item.message_count}개
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, isDark && styles.containerDark]}>
                <ActivityIndicator size="large" color={Palette.primary[500]} />
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, isDark && styles.textLight]}>💬 대화 목록</Text>
                <TouchableOpacity style={styles.newButton} onPress={onNewSession}>
                    <IconSymbol name="plus" size={16} color="#fff" />
                    <Text style={styles.newButtonText}>새 대화</Text>
                </TouchableOpacity>
            </View>

            {sessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🤖</Text>
                    <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                        아직 대화가 없습니다
                    </Text>
                    <TouchableOpacity style={styles.startButton} onPress={onNewSession}>
                        <Text style={styles.startButtonText}>첫 대화 시작하기</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#121212',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#333',
    },
    textLight: {
        color: '#fff',
    },
    textMuted: {
        color: '#888',
    },
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.primary[500],
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    newButtonText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    listContent: {
        padding: Spacing.sm,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: '#f9f9f9',
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
    },
    sessionItemDark: {
        backgroundColor: '#1e1e1e',
    },
    sessionItemSelected: {
        borderWidth: 2,
        borderColor: Palette.primary[500],
    },
    sessionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    sessionContent: {
        flex: 1,
    },
    sessionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: '#333',
    },
    sessionPreview: {
        fontSize: FontSize.sm,
        color: '#666',
        marginTop: 2,
    },
    sessionMeta: {
        alignItems: 'flex-end',
    },
    sessionDate: {
        fontSize: FontSize.xs,
        color: '#999',
    },
    sessionCount: {
        fontSize: FontSize.xs,
        color: '#999',
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: '#666',
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    startButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    startButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
});

export default ChatSessionList;
