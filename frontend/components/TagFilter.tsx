import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { Palette, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

interface Tag {
    id: number;
    name: string;
    color?: string;
    count?: number;
}

interface TagFilterProps {
    selectedTags: number[];
    onTagsChange: (tags: number[]) => void;
    multiSelect?: boolean;
}

export const TagFilter: React.FC<TagFilterProps> = ({
    selectedTags,
    onTagsChange,
    multiSelect = true,
}) => {
    const { isDark } = useTheme();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const response = await api.get('/api/tags/');
            setTags(response.data.results || response.data || []);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTagPress = (tagId: number) => {
        if (multiSelect) {
            if (selectedTags.includes(tagId)) {
                onTagsChange(selectedTags.filter(id => id !== tagId));
            } else {
                onTagsChange([...selectedTags, tagId]);
            }
        } else {
            if (selectedTags.includes(tagId)) {
                onTagsChange([]);
            } else {
                onTagsChange([tagId]);
            }
        }
    };

    const clearAll = () => {
        onTagsChange([]);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Palette.primary[500]} />
            </View>
        );
    }

    if (tags.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>
                    태그 필터
                </Text>
                {selectedTags.length > 0 && (
                    <TouchableOpacity onPress={clearAll}>
                        <Text style={styles.clearButton}>초기화</Text>
                    </TouchableOpacity>
                )}
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                        <TouchableOpacity
                            key={tag.id}
                            style={[
                                styles.tagChip,
                                isDark && styles.tagChipDark,
                                isSelected && styles.tagChipSelected,
                            ]}
                            onPress={() => handleTagPress(tag.id)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.tagText,
                                    isDark && styles.tagTextDark,
                                    isSelected && styles.tagTextSelected,
                                ]}
                            >
                                #{tag.name}
                            </Text>
                            {tag.count !== undefined && (
                                <Text
                                    style={[
                                        styles.tagCount,
                                        isSelected && styles.tagCountSelected,
                                    ]}
                                >
                                    {tag.count}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: Spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
    },
    textLight: {
        color: Palette.neutral[300],
    },
    clearButton: {
        fontSize: FontSize.xs,
        color: Palette.primary[500],
    },
    loadingContainer: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.neutral[100],
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.neutral[200],
        gap: 4,
    },
    tagChipDark: {
        backgroundColor: '#2A2A30',
        borderColor: '#3A3A42',
    },
    tagChipSelected: {
        backgroundColor: Palette.primary[500],
        borderColor: Palette.primary[500],
    },
    tagText: {
        fontSize: FontSize.sm,
        color: Palette.neutral[700],
    },
    tagTextDark: {
        color: Palette.neutral[300],
    },
    tagTextSelected: {
        color: '#fff',
        fontWeight: FontWeight.medium,
    },
    tagCount: {
        fontSize: FontSize.xs,
        color: Palette.neutral[500],
        backgroundColor: Palette.neutral[200],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    tagCountSelected: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        color: '#fff',
    },
});

export default TagFilter;
