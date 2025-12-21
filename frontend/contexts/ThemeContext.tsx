import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    themeMode: ThemeMode;
    isDark: boolean;
    colors: typeof Colors.light;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = 'app_theme_mode';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isLoading, setIsLoading] = useState(true);

    // 저장된 테마 불러오기
    useEffect(() => {
        const loadTheme = async () => {
            try {
                let savedTheme: string | null = null;

                if (Platform.OS === 'web') {
                    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
                } else {
                    savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                }

                if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTheme();
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

    // 다크모드 여부 결정
    const isDark = themeMode === 'system'
        ? systemColorScheme === 'dark'
        : themeMode === 'dark';

    // 현재 테마 색상
    const colors = isDark ? Colors.dark : Colors.light;

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
