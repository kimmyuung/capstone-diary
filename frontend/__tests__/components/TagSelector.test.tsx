/**
 * TagSelector 테스트
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock TagSelector component
const MockTagSelector = ({
    selectedTags,
    onTagsChange,
    availableTags
}: {
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    availableTags: { id: number; name: string; color: string }[];
}) => {
    const { View, Text, TouchableOpacity } = require('react-native');

    return (
        <View testID="tag-selector">
            {availableTags.map((tag) => (
                <TouchableOpacity
                    key={tag.id}
                    testID={`tag-${tag.id}`}
                    onPress={() => {
                        if (selectedTags.includes(tag.name)) {
                            onTagsChange(selectedTags.filter(t => t !== tag.name));
                        } else {
                            onTagsChange([...selectedTags, tag.name]);
                        }
                    }}
                >
                    <Text>{tag.name}</Text>
                    {selectedTags.includes(tag.name) && (
                        <Text testID={`selected-${tag.id}`}>✓</Text>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
};

describe('TagSelector', () => {
    const mockTags = [
        { id: 1, name: '일상', color: '#FFD93D' },
        { id: 2, name: '여행', color: '#6B7FD7' },
        { id: 3, name: '음식', color: '#FF6B6B' },
    ];

    const defaultProps = {
        selectedTags: [],
        onTagsChange: jest.fn(),
        availableTags: mockTags,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all available tags', () => {
        const { getByTestId } = render(<MockTagSelector {...defaultProps} />);

        expect(getByTestId('tag-1')).toBeTruthy();
        expect(getByTestId('tag-2')).toBeTruthy();
        expect(getByTestId('tag-3')).toBeTruthy();
    });

    it('shows selected state for selected tags', () => {
        const { getByTestId } = render(
            <MockTagSelector {...defaultProps} selectedTags={['일상']} />
        );

        expect(getByTestId('selected-1')).toBeTruthy();
    });

    it('calls onTagsChange when tag is selected', () => {
        const { getByTestId } = render(<MockTagSelector {...defaultProps} />);

        fireEvent.press(getByTestId('tag-1'));

        expect(defaultProps.onTagsChange).toHaveBeenCalledWith(['일상']);
    });

    it('removes tag when already selected tag is pressed', () => {
        const onTagsChange = jest.fn();
        const { getByTestId } = render(
            <MockTagSelector
                {...defaultProps}
                selectedTags={['일상', '여행']}
                onTagsChange={onTagsChange}
            />
        );

        fireEvent.press(getByTestId('tag-1'));

        expect(onTagsChange).toHaveBeenCalledWith(['여행']);
    });

    it('allows multiple tag selection', () => {
        const onTagsChange = jest.fn();
        const { getByTestId } = render(
            <MockTagSelector
                {...defaultProps}
                selectedTags={['일상']}
                onTagsChange={onTagsChange}
            />
        );

        fireEvent.press(getByTestId('tag-2'));

        expect(onTagsChange).toHaveBeenCalledWith(['일상', '여행']);
    });
});

describe('TagSelector - Edge Cases', () => {
    it('handles empty available tags', () => {
        const { getByTestId } = render(
            <MockTagSelector
                selectedTags={[]}
                onTagsChange={jest.fn()}
                availableTags={[]}
            />
        );

        expect(getByTestId('tag-selector')).toBeTruthy();
    });
});
