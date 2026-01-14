import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';
type FontSizeMode = 'small' | 'medium' | 'large';

interface ThemeContextType {
    themeMode: ThemeMode;
    isDark: boolean;
    colors: typeof Colors.light;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    // 글꼴 크기 설정
    fontSizeMode: FontSizeMode;
    setFontSizeMode: (mode: FontSizeMode) => void;
    fontScale: number;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = 'app_theme_mode';
const FONT_SIZE_STORAGE_KEY = 'app_font_size_mode';

// 글꼴 크기 스케일
const fontScales: Record<FontSizeMode, number> = {
    small: 0.85,
    medium: 1.0,
    large: 1.15,
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [fontSizeMode, setFontSizeModeState] = useState<FontSizeMode>('medium');
    const [isLoading, setIsLoading] = useState(true);

    // 저장된 테마 불러오기
    useEffect(() => {
        const loadSettings = async () => {
            try {
                let savedTheme: string | null = null;
                let savedFontSize: string | null = null;

                if (Platform.OS === 'web') {
                    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
                    savedFontSize = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
                } else {
                    savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                    savedFontSize = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
                }

                if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
                if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
                    setFontSizeModeState(savedFontSize as FontSizeMode);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // 테마 설정 저장
    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(THEME_STORAGE_KEY, mode);
            } else {
                await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            }
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    // 글꼴 크기 설정 저장
    const setFontSizeMode = async (mode: FontSizeMode) => {
        setFontSizeModeState(mode);
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(FONT_SIZE_STORAGE_KEY, mode);
            } else {
                await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, mode);
            }
        } catch (error) {
            console.error('Failed to save font size:', error);
        }
    };

    // 다크모드 여부 결정
    const isDark = themeMode === 'system'
        ? systemColorScheme === 'dark'
        : themeMode === 'dark';

    // 현재 테마 색상
    const colors = isDark ? Colors.dark : Colors.light;

    // 글꼴 크기 스케일
    const fontScale = fontScales[fontSizeMode];

    // 테마 토글
    const toggleTheme = () => {
        if (themeMode === 'light') {
            setThemeMode('dark');
        } else if (themeMode === 'dark') {
            setThemeMode('light');
        } else {
            // system 모드일 때는 현재 적용된 테마의 반대로
            setThemeMode(isDark ? 'light' : 'dark');
        }
    };

    const value: ThemeContextType = {
        themeMode,
        isDark,
        colors,
        setThemeMode,
        toggleTheme,
        fontSizeMode,
        setFontSizeMode,
        fontScale,
    };

    if (isLoading) {
        return null; // 로딩 중에는 렌더링 안함
    }

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
