// components/AISummaryPreview.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { aiService, SummaryResult } from '@/services/api';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface AISummaryPreviewProps {
    content: string;
    onSelectContent: (content: string, isSummary: boolean) => void;
    isDark?: boolean;
}

export default function AISummaryPreview({ content, onSelectContent, isDark = false }: AISummaryPreviewProps) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SummaryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<'default' | 'short' | 'bullet'>('default');

    const handleSummarize = async () => {
        if (content.trim().length < 10) {
            setError('요약하기에 내용이 너무 짧습니다. 10자 이상 작성해주세요.');
            setVisible(true);
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setVisible(true);

        try {
            const data = await aiService.summarize(content, selectedStyle);
            setResult(data);
        } catch (err: any) {
            console.error('Summary error:', err);
            setError(err.response?.data?.error || '요약 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOriginal = () => {
        onSelectContent(content, false);
        setVisible(false);
    };

    const handleSelectSummary = () => {
        if (result) {
            onSelectContent(result.summary, true);
            setVisible(false);
        }
    };

    return (
        <View>
            {/* AI 요약 버튼 */}
            <TouchableOpacity
                style={[styles.summaryButton, isDark && styles.summaryButtonDark]}
                onPress={handleSummarize}
            >
                <Text style={styles.summaryButtonText}>✨ AI 요약 미리보기</Text>
            </TouchableOpacity>

            {/* 요약 결과 모달 */}
            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        {/* 헤더 */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                                ✨ AI 요약
                            </Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <Text style={styles.closeButton}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 스타일 선택 */}
                        <View style={styles.styleSelector}>
                            {(['default', 'short', 'bullet'] as const).map(style => (
                                <TouchableOpacity
                                    key={style}
                                    style={[
                                        styles.styleOption,
                                        selectedStyle === style && styles.styleOptionActive,
                                    ]}
                                    onPress={() => setSelectedStyle(style)}
                                >
                                    <Text style={[
                                        styles.styleOptionText,
                                        selectedStyle === style && styles.styleOptionTextActive,
                                    ]}>
                                        {style === 'default' ? '📝 3줄' :
                                            style === 'short' ? '💬 1줄' : '📋 불릿'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.reloadButton}
                                onPress={handleSummarize}
                                disabled={loading}
                            >
                                <Text style={styles.reloadButtonText}>🔄</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollContent}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Palette.primary[500]} />
                                    <Text style={[styles.loadingText, isDark && styles.textMuted]}>
                                        AI가 요약 중...
                                    </Text>
                                </View>
                            ) : error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : result ? (
                                <>
                                    {/* 원본 */}
                                    <View style={styles.contentSection}>
                                        <View style={styles.contentHeader}>
                                            <Text style={[styles.contentLabel, isDark && styles.textMuted]}>
                                                📄 원본 ({result.original_length}자)
                                            </Text>
                                        </View>
                                        <View style={[styles.contentBox, isDark && styles.contentBoxDark]}>
                                            <Text
                                                style={[styles.contentText, isDark && styles.textDark]}
                                                numberOfLines={5}
                                            >
                                                {result.original_content}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.selectButton}
                                            onPress={handleSelectOriginal}
                                        >
                                            <Text style={styles.selectButtonText}>원본으로 저장</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* 요약 */}
                                    <View style={styles.contentSection}>
                                        <View style={styles.contentHeader}>
                                            <Text style={[styles.contentLabel, isDark && styles.textMuted]}>
                                                ✨ AI 요약 ({result.summary_length}자)
                                            </Text>
                                            <Text style={styles.compressionRate}>
                                                {Math.round((1 - result.summary_length / result.original_length) * 100)}% 압축
                                            </Text>
                                        </View>
                                        <View style={[styles.contentBox, styles.summaryBox, isDark && styles.summaryBoxDark]}>
                                            <Text style={[styles.contentText, isDark && styles.textDark]}>
                                                {result.summary}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.selectButton, styles.selectButtonPrimary]}
                                            onPress={handleSelectSummary}
                                        >
                                            <Text style={styles.selectButtonTextPrimary}>요약으로 저장</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : null}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryButton: {
        backgroundColor: Palette.primary[50],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: Palette.primary[200],
    },
    summaryButtonDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: Palette.primary[500],
    },
    summaryButtonText: {
        fontSize: FontSize.sm,
        color: Palette.primary[600],
        fontWeight: FontWeight.medium,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '90%',
    },
    modalContentDark: {
        backgroundColor: '#1E1E1E',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    closeButton: {
        fontSize: 28,
        color: Palette.neutral[400],
        lineHeight: 28,
    },
    textDark: {
        color: '#fff',
    },
    textMuted: {
        color: Palette.neutral[400],
    },
    styleSelector: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    styleOption: {
        flex: 1,
        paddingVertical: Spacing.sm,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    styleOptionActive: {
        backgroundColor: Palette.primary[500],
    },
    styleOptionText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
    },
    styleOptionTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    reloadButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
    },
    reloadButtonText: {
        fontSize: FontSize.md,
    },
    scrollContent: {
        maxHeight: 500,
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    loadingText: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
    },
    errorContainer: {
        padding: Spacing.lg,
        backgroundColor: Palette.status.error + '10',
        borderRadius: BorderRadius.md,
    },
    errorText: {
        color: Palette.status.error,
        fontSize: FontSize.md,
        textAlign: 'center',
    },
    contentSection: {
        marginBottom: Spacing.lg,
    },
    contentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    contentLabel: {
        fontSize: FontSize.sm,
        color: Palette.neutral[500],
        fontWeight: FontWeight.medium,
    },
    compressionRate: {
        fontSize: FontSize.xs,
        color: Palette.status.success,
        fontWeight: FontWeight.semibold,
    },
    contentBox: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    contentBoxDark: {
        backgroundColor: '#2D2D2D',
    },
    summaryBox: {
        backgroundColor: Palette.primary[50],
        borderWidth: 1,
        borderColor: Palette.primary[200],
    },
    summaryBoxDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: Palette.primary[500],
    },
    contentText: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
        lineHeight: 24,
    },
    selectButton: {
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Palette.neutral[300],
    },
    selectButtonPrimary: {
        backgroundColor: Palette.primary[500],
        borderColor: Palette.primary[500],
    },
    selectButtonText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        fontWeight: FontWeight.medium,
    },
    selectButtonTextPrimary: {
        fontSize: FontSize.sm,
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
});
