import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TypingAnimation } from '@/components/animations/TypingAnimation';
import { Palette, Spacing, BorderRadius, FontSize } from '@/constants/theme';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatScreen() {
    const { isDark } = useTheme();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: '안녕하세요! 과거 일기에 대해 궁금한 점이 있으신가요? 무엇이든 물어보세요.' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // API 호출
            const response = await api.post('/api/chat/', {
                message: userMessage.content,
                history: messages.map(m => ({ role: m.role, content: m.content }))
            });
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
                isUser ? { backgroundColor: Palette.primary[500] } : { backgroundColor: isDark ? '#333' : '#f0f0f0' }
            ]}>
                <Text style={[
                    styles.messageText,
                    isUser ? styles.userText : (isDark ? styles.darkText : styles.lightText)
                ]}>
                    {item.content}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, isDark && styles.containerDark]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <Text style={[styles.headerTitle, isDark && styles.textDark]}>🤖 다이어리 AI</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                style={styles.list}
                ListHeaderComponent={
                    messages.length === 1 ? (
                        <View style={styles.suggestionsContainer}>
                            <Text style={[styles.suggestionsTitle, isDark && styles.textDark]}>
                                💡 추천 질문
                            </Text>
                            <View style={styles.suggestions}>
                                {[
                                    '지난 주 기분은 어땠어?',
                                    '가장 행복했던 날은?',
                                    '최근 자주 쓴 감정은?',
                                    '이번 달 일기 요약해줘',
                                ].map((question, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.suggestionButton, isDark && styles.suggestionButtonDark]}
                                        onPress={() => {
                                            setInputText(question);
                                        }}
                                    >
                                        <Text style={[styles.suggestionText, isDark && styles.suggestionTextDark]}>
                                            {question}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    isLoading ? <TypingAnimation text="AI가 응답 중입니다" /> : null
                }
            />

            <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="일기 내용을 물어보세요..."
                    placeholderTextColor={isDark ? '#888' : '#999'}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <IconSymbol name="arrow.up" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#121212',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    textDark: {
        color: '#fff',
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    lightText: {
        color: '#333',
    },
    darkText: {
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'flex-end',
    },
    inputContainerDark: {
        borderTopColor: '#333',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 10,
    },
    inputDark: {
        backgroundColor: '#333',
        color: '#fff',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Palette.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    // 제안 질문 스타일
    suggestionsContainer: {
        marginBottom: 20,
    },
    suggestionsTitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 12,
    },
    suggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionButton: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    suggestionButtonDark: {
        backgroundColor: '#333',
        borderColor: '#444',
    },
    suggestionText: {
        fontSize: 14,
        color: '#666',
    },
    suggestionTextDark: {
        color: '#aaa',
    },
});
