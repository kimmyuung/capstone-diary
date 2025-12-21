// components/TagSelector.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { tagService, Tag } from '@/services/api';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface TagSelectorProps {
    selectedTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
    isDark?: boolean;
}

const TAG_COLORS = [
    '#6366F1', // 인디고
    '#8B5CF6', // 바이올렛
    '#EC4899', // 핑크
    '#EF4444', // 레드
    '#F97316', // 오렌지
    '#EAB308', // 옐로우
    '#22C55E', // 그린
    '#06B6D4', // 시안
    '#3B82F6', // 블루
    '#64748B', // 슬레이트
];

export default function TagSelector({ selectedTags, onTagsChange, isDark = false }: TagSelectorProps) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadTags();
    }, []);

    const loadTags = async () => {
        try {
            const result = await tagService.getAll();
            setTags(result);
        } catch (err) {
            console.error('Failed to load tags:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            Alert.alert('알림', '태그 이름을 입력해주세요.');
            return;
        }

        setCreating(true);
        try {
            const newTag = await tagService.create({
                name: newTagName.trim(),
                color: newTagColor,
            });
            setTags([...tags, newTag]);
            setNewTagName('');
            setNewTagColor(TAG_COLORS[0]);
            Alert.alert('성공', '태그가 생성되었습니다.');
        } catch (err: any) {
            Alert.alert('오류', err.response?.data?.name?.[0] || '태그 생성에 실패했습니다.');
        } finally {
            setCreating(false);
        }
    };

    const handleToggleTag = (tag: Tag) => {
        const isSelected = selectedTags.some(t => t.id === tag.id);
        if (isSelected) {
            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
        } else {
            onTagsChange([...selectedTags, tag]);
        }
    };

    const handleDeleteTag = async (tag: Tag) => {
        Alert.alert(
            '태그 삭제',
            `"${tag.name}" 태그를 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await tagService.delete(tag.id);
                            setTags(tags.filter(t => t.id !== tag.id));
                            onTagsChange(selectedTags.filter(t => t.id !== tag.id));
                        } catch (err) {
                            Alert.alert('오류', '태그 삭제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };

    const renderTag = ({ item }: { item: Tag }) => {
        const isSelected = selectedTags.some(t => t.id === item.id);
        return (
            <TouchableOpacity
                style={[
                    styles.tagItem,
                    { borderColor: item.color },
                    isSelected && { backgroundColor: item.color },
                ]}
                onPress={() => handleToggleTag(item)}
                onLongPress={() => handleDeleteTag(item)}
            >
                <Text
                    style={[
                        styles.tagItemText,
                        isSelected && styles.tagItemTextSelected,
                    ]}
                >
                    #{item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* 선택된 태그 표시 */}
            <View style={styles.selectedTags}>
                {selectedTags.length === 0 ? (
                    <Text style={[styles.placeholder, isDark && styles.textMuted]}>
                        태그 없음
                    </Text>
                ) : (
                    selectedTags.map(tag => (
                        <View
                            key={tag.id}
                            style={[styles.selectedTag, { backgroundColor: tag.color }]}
                        >
                            <Text style={styles.selectedTagText}>#{tag.name}</Text>
                            <TouchableOpacity onPress={() => handleToggleTag(tag)}>
                                <Text style={styles.removeTag}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>

            {/* 태그 선택 버튼 */}
            <TouchableOpacity
                style={[styles.addButton, isDark && styles.addButtonDark]}
                onPress={() => setShowModal(true)}
            >
                <Text style={[styles.addButtonText, isDark && styles.textDark]}>+ 태그 추가</Text>
            </TouchableOpacity>

            {/* 태그 선택 모달 */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, isDark && styles.textDark]}>태그 선택</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Text style={styles.closeButton}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 태그 생성 */}
                        <View style={styles.createSection}>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                placeholder="새 태그 이름"
                                placeholderTextColor={Palette.neutral[400]}
                                value={newTagName}
                                onChangeText={setNewTagName}
                                maxLength={20}
                            />
                            <View style={styles.colorPicker}>
                                {TAG_COLORS.map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color },
                                            newTagColor === color && styles.colorOptionSelected,
                                        ]}
                                        onPress={() => setNewTagColor(color)}
                                    />
                                ))}
                            </View>
                            <TouchableOpacity
                                style={[styles.createButton, creating && styles.createButtonDisabled]}
                                onPress={handleCreateTag}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.createButtonText}>생성</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* 태그 목록 */}
                        {loading ? (
                            <ActivityIndicator size="large" color={Palette.primary[500]} style={{ marginTop: Spacing.lg }} />
                        ) : tags.length === 0 ? (
                            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                                태그가 없습니다. 위에서 새 태그를 만들어보세요!
                            </Text>
                        ) : (
                            <FlatList
                                data={tags}
                                renderItem={renderTag}
                                keyExtractor={item => item.id.toString()}
                                numColumns={3}
                                contentContainerStyle={styles.tagList}
                                columnWrapperStyle={styles.tagRow}
                            />
                        )}

                        <Text style={[styles.hint, isDark && styles.textMuted]}>
                            💡 길게 눌러서 태그 삭제
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: Spacing.sm,
    },
    selectedTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    placeholder: {
        fontSize: FontSize.sm,
        color: Palette.neutral[400],
        fontStyle: 'italic',
    },
    selectedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        gap: 4,
    },
    selectedTagText: {
        fontSize: FontSize.sm,
        color: '#fff',
        fontWeight: FontWeight.medium,
    },
    removeTag: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginLeft: 2,
    },
    addButton: {
        backgroundColor: Palette.neutral[100],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignSelf: 'flex-start',
    },
    addButtonDark: {
        backgroundColor: '#2D2D2D',
    },
    addButtonText: {
        fontSize: FontSize.sm,
        color: Palette.primary[500],
        fontWeight: FontWeight.medium,
    },
    textDark: {
        color: '#fff',
    },
    textMuted: {
        color: Palette.neutral[400],
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
        maxHeight: '80%',
    },
    modalContentDark: {
        backgroundColor: '#1E1E1E',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
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
    createSection: {
        marginBottom: Spacing.lg,
        paddingBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[200],
    },
    input: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: FontSize.md,
        marginBottom: Spacing.sm,
    },
    inputDark: {
        backgroundColor: '#2D2D2D',
        color: '#fff',
    },
    colorPicker: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    colorOption: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    createButton: {
        backgroundColor: Palette.primary[500],
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
        fontSize: FontSize.md,
    },
    tagList: {
        paddingBottom: Spacing.lg,
    },
    tagRow: {
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    tagItem: {
        flex: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        alignItems: 'center',
    },
    tagItemText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
    },
    tagItemTextSelected: {
        color: '#fff',
        fontWeight: FontWeight.semibold,
    },
    emptyText: {
        textAlign: 'center',
        color: Palette.neutral[500],
        marginVertical: Spacing.xl,
    },
    hint: {
        textAlign: 'center',
        fontSize: FontSize.xs,
        color: Palette.neutral[400],
        marginTop: Spacing.md,
    },
});
