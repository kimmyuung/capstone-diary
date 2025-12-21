// components/TemplateSelector.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    ActivityIndicator,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { templateService, DiaryTemplate } from '@/services/api';
import { replacePlaceholders, getSupportedPlaceholders } from '@/utils/templatePlaceholder';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface TemplateSelectorProps {
    onSelect: (content: string, templateName: string) => void;
    isDark?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    daily: '📅 일상',
    gratitude: '🙏 감사',
    goal: '🎯 목표',
    reflection: '💭 회고',
    emotion: '😊 감정',
    travel: '✈️ 여행',
    exercise: '🏃 운동',
    custom: '✏️ 커스텀',
};

export default function TemplateSelector({ onSelect, isDark = false }: TemplateSelectorProps) {
    const [visible, setVisible] = useState(false);
    const [templates, setTemplates] = useState<DiaryTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'system' | 'my' | 'create' | 'ai'>('system');

    // 새 템플릿 생성 상태
    const [newName, setNewName] = useState('');
    const [newEmoji, setNewEmoji] = useState('📝');
    const [newDescription, setNewDescription] = useState('');
    const [newContent, setNewContent] = useState('');
    const [creating, setCreating] = useState(false);

    // AI 템플릿 생성 상태
    const [aiTopic, setAiTopic] = useState('');
    const [aiStyle, setAiStyle] = useState<'default' | 'simple' | 'detailed'>('default');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState<{
        name: string;
        emoji: string;
        description: string;
        content: string;
    } | null>(null);

    useEffect(() => {
        if (visible && (activeTab === 'system' || activeTab === 'my')) {
            loadTemplates();
        }
    }, [visible, activeTab]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            if (activeTab === 'system') {
                const data = await templateService.getSystem();
                setTemplates(data.templates);
            } else if (activeTab === 'my') {
                const data = await templateService.getMy();
                setTemplates(data.templates);
            }
        } catch (err) {
            console.error('Failed to load templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = async (template: DiaryTemplate) => {
        try {
            const result = await templateService.use(template.id);
            // 플레이스홀더 치환 적용
            const processedContent = replacePlaceholders(result.content);
            onSelect(processedContent, template.name);
            setVisible(false);
            Alert.alert('✅ 템플릿 적용', result.message);
        } catch (err) {
            console.error('Failed to use template:', err);
            const processedContent = replacePlaceholders(template.content);
            onSelect(processedContent, template.name);
            setVisible(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newName.trim() || !newContent.trim()) {
            Alert.alert('알림', '이름과 내용을 입력해주세요.');
            return;
        }

        setCreating(true);
        try {
            await templateService.create({
                name: newName.trim(),
                emoji: newEmoji,
                description: newDescription.trim() || '내 커스텀 템플릿',
                content: newContent,
                category: 'custom',
            });

            Alert.alert('성공', '템플릿이 생성되었습니다.');
            setNewName('');
            setNewEmoji('📝');
            setNewDescription('');
            setNewContent('');
            setActiveTab('my');
        } catch (err: any) {
            Alert.alert('오류', err.response?.data?.name?.[0] || '템플릿 생성에 실패했습니다.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteTemplate = async (template: DiaryTemplate) => {
        if (template.is_system) {
            Alert.alert('알림', '시스템 템플릿은 삭제할 수 없습니다.');
            return;
        }

        Alert.alert(
            '템플릿 삭제',
            `"${template.name}" 템플릿을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await templateService.delete(template.id);
                            loadTemplates();
                        } catch (err) {
                            Alert.alert('오류', '삭제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    // AI 템플릿 생성
    const handleAIGenerate = async () => {
        if (!aiTopic.trim()) {
            Alert.alert('알림', '주제를 입력해주세요.');
            return;
        }

        setAiGenerating(true);
        setAiResult(null);

        try {
            const result = await templateService.generate(aiTopic, aiStyle);
            setAiResult({
                name: result.name,
                emoji: result.emoji,
                description: result.description,
                content: result.content,
            });
        } catch (err: any) {
            Alert.alert('오류', err.response?.data?.error || 'AI 템플릿 생성에 실패했습니다.');
        } finally {
            setAiGenerating(false);
        }
    };

    // AI 생성 템플릿 저장
    const handleSaveAITemplate = async () => {
        if (!aiResult) return;

        try {
            await templateService.saveGenerated(aiResult);
            Alert.alert('성공', '템플릿이 저장되었습니다.');
            setAiResult(null);
            setAiTopic('');
            setActiveTab('my');
        } catch (err: any) {
            Alert.alert('오류', err.response?.data?.error || '저장에 실패했습니다.');
        }
    };

    // AI 생성 템플릿 바로 사용
    const handleUseAITemplate = () => {
        if (!aiResult) return;
        const processedContent = replacePlaceholders(aiResult.content);
        onSelect(processedContent, aiResult.name);
        setVisible(false);
        setAiResult(null);
        setAiTopic('');
    };

    const renderTemplate = ({ item }: { item: DiaryTemplate }) => (
        <TouchableOpacity
            style={[styles.templateCard, isDark && styles.templateCardDark]}
            onPress={() => handleSelectTemplate(item)}
            onLongPress={() => handleDeleteTemplate(item)}
        >
            <View style={styles.templateHeader}>
                <Text style={styles.templateEmoji}>{item.emoji}</Text>
                <View style={styles.templateInfo}>
                    <Text style={[styles.templateName, isDark && styles.textDark]}>{item.name}</Text>
                    <Text style={[styles.templateDesc, isDark && styles.textMuted]} numberOfLines={1}>
                        {item.description}
                    </Text>
                </View>
                {item.use_count > 0 && (
                    <View style={styles.useBadge}>
                        <Text style={styles.useBadgeText}>{item.use_count}</Text>
                    </View>
                )}
            </View>
            <Text style={[styles.templatePreview, isDark && styles.textMuted]} numberOfLines={3}>
                {item.content.substring(0, 100)}...
            </Text>
            <View style={styles.templateFooter}>
                <Text style={styles.categoryTag}>{CATEGORY_LABELS[item.category] || item.category}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderAITab = () => (
        <ScrollView style={styles.createForm}>
            <Text style={[styles.label, isDark && styles.textDark]}>🤖 무슨 템플릿을 만들까요?</Text>
            <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="예: 독서 일기, 요리 기록, 프로그래밍 공부..."
                placeholderTextColor={Palette.neutral[400]}
                value={aiTopic}
                onChangeText={setAiTopic}
                maxLength={50}
            />

            <Text style={[styles.label, isDark && styles.textDark]}>스타일</Text>
            <View style={styles.styleOptions}>
                {(['simple', 'default', 'detailed'] as const).map((s) => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.styleOption, aiStyle === s && styles.styleOptionActive]}
                        onPress={() => setAiStyle(s)}
                    >
                        <Text style={[styles.styleOptionText, aiStyle === s && styles.styleOptionTextActive]}>
                            {s === 'simple' ? '✏️ 간단' : s === 'default' ? '📝 보통' : '📋 상세'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.createButton, (aiGenerating || !aiTopic) && styles.createButtonDisabled]}
                onPress={handleAIGenerate}
                disabled={aiGenerating || !aiTopic}
            >
                {aiGenerating ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.createButtonText}>✨ AI로 생성하기</Text>
                )}
            </TouchableOpacity>

            {aiResult && (
                <View style={[styles.aiResultBox, isDark && styles.aiResultBoxDark]}>
                    <View style={styles.aiResultHeader}>
                        <Text style={styles.aiResultEmoji}>{aiResult.emoji}</Text>
                        <Text style={[styles.aiResultName, isDark && styles.textDark]}>{aiResult.name}</Text>
                    </View>
                    <Text style={[styles.aiResultDesc, isDark && styles.textMuted]}>{aiResult.description}</Text>
                    <Text style={[styles.aiResultContent, isDark && styles.textMuted]} numberOfLines={6}>
                        {aiResult.content}
                    </Text>

                    <View style={styles.aiResultActions}>
                        <TouchableOpacity style={styles.aiActionSecondary} onPress={handleSaveAITemplate}>
                            <Text style={styles.aiActionSecondaryText}>💾 저장하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.aiActionPrimary} onPress={handleUseAITemplate}>
                            <Text style={styles.aiActionPrimaryText}>✅ 바로 사용</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* 플레이스홀더 안내 */}
            <View style={styles.placeholderInfo}>
                <Text style={[styles.placeholderTitle, isDark && styles.textDark]}>💡 플레이스홀더</Text>
                <Text style={[styles.placeholderDesc, isDark && styles.textMuted]}>
                    템플릿에 {'{{날짜}}'}, {'{{요일}}'}, {'{{시간}}'} 등을 넣으면 자동으로 채워집니다.
                </Text>
            </View>
        </ScrollView>
    );

    return (
        <View>
            <TouchableOpacity
                style={[styles.selectorButton, isDark && styles.selectorButtonDark]}
                onPress={() => setVisible(true)}
            >
                <Text style={styles.selectorButtonText}>📋 템플릿 선택</Text>
            </TouchableOpacity>

            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDark && styles.textDark]}>📋 템플릿</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <Text style={styles.closeButton}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tabs}>
                            {(['system', 'my', 'ai', 'create'] as const).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                                    onPress={() => setActiveTab(tab)}
                                >
                                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                        {tab === 'system' ? '기본' : tab === 'my' ? '내 것' : tab === 'ai' ? '✨ AI' : '+ 만들기'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {activeTab === 'ai' ? renderAITab() : activeTab === 'create' ? (
                            <ScrollView style={styles.createForm}>
                                <Text style={[styles.label, isDark && styles.textDark]}>템플릿 이름</Text>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    placeholder="예: 독서 일기"
                                    placeholderTextColor={Palette.neutral[400]}
                                    value={newName}
                                    onChangeText={setNewName}
                                    maxLength={30}
                                />

                                <Text style={[styles.label, isDark && styles.textDark]}>아이콘</Text>
                                <TextInput
                                    style={[styles.input, styles.emojiInput, isDark && styles.inputDark]}
                                    value={newEmoji}
                                    onChangeText={setNewEmoji}
                                    maxLength={2}
                                />

                                <Text style={[styles.label, isDark && styles.textDark]}>설명 (선택)</Text>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    placeholder="이 템플릿에 대한 간단한 설명"
                                    placeholderTextColor={Palette.neutral[400]}
                                    value={newDescription}
                                    onChangeText={setNewDescription}
                                    maxLength={100}
                                />

                                <Text style={[styles.label, isDark && styles.textDark]}>템플릿 내용</Text>
                                <TextInput
                                    style={[styles.input, styles.contentInput, isDark && styles.inputDark]}
                                    placeholder="일기 작성 시 미리 채워질 내용..."
                                    placeholderTextColor={Palette.neutral[400]}
                                    value={newContent}
                                    onChangeText={setNewContent}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity
                                    style={[styles.createButton, creating && styles.createButtonDisabled]}
                                    onPress={handleCreateTemplate}
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.createButtonText}>템플릿 생성</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        ) : loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Palette.primary[500]} />
                            </View>
                        ) : templates.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                                    {activeTab === 'my' ? '아직 만든 템플릿이 없어요.\n새로 만들어보세요!' : '템플릿이 없습니다.'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={templates}
                                renderItem={renderTemplate}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={styles.templateList}
                            />
                        )}

                        <Text style={[styles.hint, isDark && styles.textMuted]}>
                            💡 길게 눌러서 커스텀 템플릿 삭제
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    selectorButton: {
        backgroundColor: Palette.neutral[100],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignSelf: 'flex-start',
    },
    selectorButtonDark: {
        backgroundColor: '#2D2D2D',
    },
    selectorButtonText: {
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
    tabs: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
        gap: Spacing.xs,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        backgroundColor: Palette.neutral[100],
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: Palette.primary[500],
    },
    tabText: {
        fontSize: FontSize.xs,
        color: Palette.neutral[600],
    },
    tabTextActive: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    templateList: {
        paddingBottom: Spacing.lg,
    },
    templateCard: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    templateCardDark: {
        backgroundColor: '#2D2D2D',
    },
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    templateEmoji: {
        fontSize: 28,
        marginRight: Spacing.sm,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[900],
    },
    templateDesc: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
    },
    useBadge: {
        backgroundColor: Palette.primary[100],
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    useBadgeText: {
        fontSize: FontSize.xs,
        color: Palette.primary[700],
        fontWeight: FontWeight.semibold,
    },
    templatePreview: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    templateFooter: {
        flexDirection: 'row',
    },
    categoryTag: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        backgroundColor: Palette.neutral[100],
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Palette.neutral[500],
        textAlign: 'center',
    },
    createForm: {
        maxHeight: 450,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Palette.neutral[700],
        marginBottom: Spacing.xs,
        marginTop: Spacing.sm,
    },
    input: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: FontSize.md,
    },
    inputDark: {
        backgroundColor: '#2D2D2D',
        color: '#fff',
    },
    emojiInput: {
        width: 60,
        textAlign: 'center',
        fontSize: FontSize.xl,
    },
    contentInput: {
        height: 150,
        textAlignVertical: 'top',
    },
    createButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },
    hint: {
        textAlign: 'center',
        fontSize: FontSize.xs,
        color: Palette.neutral[400],
        marginTop: Spacing.sm,
    },
    // AI 탭 스타일
    styleOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
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
    aiResultBox: {
        marginTop: Spacing.lg,
        padding: Spacing.md,
        backgroundColor: Palette.primary[50],
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.primary[200],
    },
    aiResultBoxDark: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: Palette.primary[500],
    },
    aiResultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    aiResultEmoji: {
        fontSize: 24,
        marginRight: Spacing.sm,
    },
    aiResultName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[900],
    },
    aiResultDesc: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        marginBottom: Spacing.sm,
    },
    aiResultContent: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
        backgroundColor: '#fff',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    aiResultActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    aiActionSecondary: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Palette.primary[500],
    },
    aiActionSecondaryText: {
        fontSize: FontSize.sm,
        color: Palette.primary[600],
        fontWeight: FontWeight.medium,
    },
    aiActionPrimary: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        backgroundColor: Palette.primary[500],
    },
    aiActionPrimaryText: {
        fontSize: FontSize.sm,
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    placeholderInfo: {
        marginTop: Spacing.lg,
        padding: Spacing.md,
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
    },
    placeholderTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[800],
        marginBottom: Spacing.xs,
    },
    placeholderDesc: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        lineHeight: 18,
    },
});
