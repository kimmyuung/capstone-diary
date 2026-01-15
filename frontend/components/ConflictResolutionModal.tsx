import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface ConflictData {
    localVersion: number;
    serverVersion: number;
    localData: {
        title: string;
        content: string;
        updated_at: string;
    };
    serverData: {
        title: string;
        content: string;
        updated_at: string;
    };
}

interface ConflictResolutionModalProps {
    visible: boolean;
    conflictData: ConflictData | null;
    onKeepLocal: () => void;
    onUseServer: () => void;
    onMerge?: () => void;
    onCancel: () => void;
}

/**
 * 오프라인 동기화 충돌 해결 모달
 * 
 * 서버 데이터와 로컬 데이터 충돌 시 사용자에게 선택권을 제공
 */
export function ConflictResolutionModal({
    visible,
    conflictData,
    onKeepLocal,
    onUseServer,
    onMerge,
    onCancel,
}: ConflictResolutionModalProps) {
    const [selectedOption, setSelectedOption] = useState<'local' | 'server' | null>(null);

    if (!conflictData) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const truncateContent = (content: string, maxLength: number = 100) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <Text style={styles.warningIcon}>⚠️</Text>
                        <Text style={styles.title}>동기화 충돌 발생</Text>
                    </View>

                    <Text style={styles.description}>
                        이 일기가 다른 기기에서 수정되었습니다.{'\n'}
                        어떤 버전을 유지할까요?
                    </Text>

                    <ScrollView style={styles.optionsContainer}>
                        {/* 로컬 버전 */}
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                selectedOption === 'local' && styles.optionCardSelected,
                            ]}
                            onPress={() => setSelectedOption('local')}
                            accessibilityLabel="내 기기 버전 선택"
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selectedOption === 'local' }}
                        >
                            <View style={styles.optionHeader}>
                                <Text style={styles.optionTitle}>📱 내 기기 (로컬)</Text>
                                <Text style={styles.versionBadge}>v{conflictData.localVersion}</Text>
                            </View>
                            <Text style={styles.optionTimestamp}>
                                {formatDate(conflictData.localData.updated_at)}
                            </Text>
                            <Text style={styles.optionContentTitle}>
                                {conflictData.localData.title}
                            </Text>
                            <Text style={styles.optionContentPreview}>
                                {truncateContent(conflictData.localData.content)}
                            </Text>
                        </TouchableOpacity>

                        {/* 서버 버전 */}
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                selectedOption === 'server' && styles.optionCardSelected,
                            ]}
                            onPress={() => setSelectedOption('server')}
                            accessibilityLabel="서버 버전 선택"
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selectedOption === 'server' }}
                        >
                            <View style={styles.optionHeader}>
                                <Text style={styles.optionTitle}>☁️ 서버 (최신)</Text>
                                <Text style={[styles.versionBadge, styles.serverBadge]}>
                                    v{conflictData.serverVersion}
                                </Text>
                            </View>
                            <Text style={styles.optionTimestamp}>
                                {formatDate(conflictData.serverData.updated_at)}
                            </Text>
                            <Text style={styles.optionContentTitle}>
                                {conflictData.serverData.title}
                            </Text>
                            <Text style={styles.optionContentPreview}>
                                {truncateContent(conflictData.serverData.content)}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* 버튼 영역 */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            accessibilityLabel="취소"
                            accessibilityRole="button"
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                !selectedOption && styles.confirmButtonDisabled,
                            ]}
                            onPress={() => {
                                if (selectedOption === 'local') onKeepLocal();
                                else if (selectedOption === 'server') onUseServer();
                            }}
                            disabled={!selectedOption}
                            accessibilityLabel="선택 확인"
                            accessibilityRole="button"
                        >
                            <Text style={styles.confirmButtonText}>
                                {selectedOption === 'local' ? '내 버전 유지' :
                                    selectedOption === 'server' ? '서버 버전 사용' : '선택하세요'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        ...Shadows.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[200],
    },
    warningIcon: {
        fontSize: 24,
        marginRight: Spacing.sm,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
    },
    description: {
        padding: Spacing.md,
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        lineHeight: 20,
        textAlign: 'center',
    },
    optionsContainer: {
        paddingHorizontal: Spacing.md,
        maxHeight: 300,
    },
    optionCard: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardSelected: {
        borderColor: Palette.primary[500],
        backgroundColor: Palette.primary[50],
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    optionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
    },
    versionBadge: {
        fontSize: FontSize.xs,
        backgroundColor: Palette.neutral[200],
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        color: Palette.neutral[600],
    },
    serverBadge: {
        backgroundColor: Palette.primary[100],
        color: Palette.primary[700],
    },
    optionTimestamp: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        marginBottom: Spacing.sm,
    },
    optionContentTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Palette.neutral[700],
        marginBottom: Spacing.xs,
    },
    optionContentPreview: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        lineHeight: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Palette.neutral[200],
        gap: Spacing.sm,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.neutral[100],
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: FontSize.md,
        color: Palette.neutral[600],
        fontWeight: FontWeight.medium,
    },
    confirmButton: {
        flex: 2,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Palette.primary[500],
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: Palette.neutral[300],
    },
    confirmButtonText: {
        fontSize: FontSize.md,
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});

export default ConflictResolutionModal;
