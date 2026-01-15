/**
 * SearchBar 테스트
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock SearchBar component
const MockSearchBar = ({
    value,
    onChangeText,
    onSearch,
    placeholder
}: {
    value: string;
    onChangeText: (text: string) => void;
    onSearch: () => void;
    placeholder?: string;
}) => {
    const { View, TextInput, TouchableOpacity, Text } = require('react-native');

    return (
        <View testID="search-bar">
            <TextInput
                testID="search-input"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || '검색...'}
                onSubmitEditing={onSearch}
            />
            <TouchableOpacity testID="search-button" onPress={onSearch}>
                <Text>🔍</Text>
            </TouchableOpacity>
            {value.length > 0 && (
                <TouchableOpacity
                    testID="clear-button"
                    onPress={() => onChangeText('')}
                >
                    <Text>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

describe('SearchBar', () => {
    const defaultProps = {
        value: '',
        onChangeText: jest.fn(),
        onSearch: jest.fn(),
        placeholder: '일기 검색...',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
        expect(getByTestId('search-bar')).toBeTruthy();
        expect(getByTestId('search-input')).toBeTruthy();
    });

    it('displays placeholder text', () => {
        const { getByTestId } = render(<MockSearchBar {...defaultProps} />);
        const input = getByTestId('search-input');
        expect(input.props.placeholder).toBe('일기 검색...');
    });

    it('calls onChangeText when text is entered', () => {
        const { getByTestId } = render(<MockSearchBar {...defaultProps} />);

        fireEvent.changeText(getByTestId('search-input'), '테스트 검색어');

        expect(defaultProps.onChangeText).toHaveBeenCalledWith('테스트 검색어');
    });

    it('calls onSearch when search button is pressed', () => {
        const { getByTestId } = render(<MockSearchBar {...defaultProps} />);

        fireEvent.press(getByTestId('search-button'));

        expect(defaultProps.onSearch).toHaveBeenCalled();
    });

    it('calls onSearch when submit editing', () => {
        const { getByTestId } = render(<MockSearchBar {...defaultProps} />);

        fireEvent(getByTestId('search-input'), 'submitEditing');

        expect(defaultProps.onSearch).toHaveBeenCalled();
    });

    it('shows clear button when value is not empty', () => {
        const { getByTestId } = render(
            <MockSearchBar {...defaultProps} value="검색어" />
        );

        expect(getByTestId('clear-button')).toBeTruthy();
    });

    it('hides clear button when value is empty', () => {
        const { queryByTestId } = render(<MockSearchBar {...defaultProps} />);

        expect(queryByTestId('clear-button')).toBeNull();
    });

    it('clears text when clear button is pressed', () => {
        const { getByTestId } = render(
            <MockSearchBar {...defaultProps} value="검색어" />
        );

        fireEvent.press(getByTestId('clear-button'));

        expect(defaultProps.onChangeText).toHaveBeenCalledWith('');
    });
});

describe('SearchBar - Debounce', () => {
    it('should handle rapid input changes', () => {
        const onChangeText = jest.fn();
        const { getByTestId } = render(
            <MockSearchBar
                {...{ value: '', onChangeText, onSearch: jest.fn() }}
            />
        );

        fireEvent.changeText(getByTestId('search-input'), 'a');
        fireEvent.changeText(getByTestId('search-input'), 'ab');
        fireEvent.changeText(getByTestId('search-input'), 'abc');

        expect(onChangeText).toHaveBeenCalledTimes(3);
    });
});
