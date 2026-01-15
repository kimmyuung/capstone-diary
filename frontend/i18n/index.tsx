/**
 * i18n (다국어 지원) 설정
 * 
 * 지원 언어: 한국어(ko), 영어(en), 일본어(ja)
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// 번역 파일 import
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

export type Language = 'ko' | 'en' | 'ja';

const translations: Record<Language, typeof ko> = {
    ko,
    en,
    ja,
};

const LANGUAGE_KEY = 'app_language';

interface I18nContextType {
    language: Language;
    t: (key: string, params?: Record<string, string>) => string;
    setLanguage: (lang: Language) => Promise<void>;
    languages: { code: Language; name: string; nativeName: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('ko');
    const [isLoaded, setIsLoaded] = useState(false);

    // 초기 언어 설정 로드
    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
                if (savedLang && (savedLang === 'ko' || savedLang === 'en' || savedLang === 'ja')) {
                    setLanguageState(savedLang as Language);
                } else {
                    // 시스템 언어 감지
                    const locales = Localization.getLocales();
                    const deviceLang = locales[0]?.languageCode || 'ko';
                    if (deviceLang === 'ko' || deviceLang === 'en' || deviceLang === 'ja') {
                        setLanguageState(deviceLang as Language);
                    }
                }
            } catch (e) {
                console.error('Failed to load language:', e);
            } finally {
                setIsLoaded(true);
            }
        };
        loadLanguage();
    }, []);

    // 언어 변경
    const setLanguage = async (lang: Language) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, lang);
            setLanguageState(lang);
        } catch (e) {
            console.error('Failed to save language:', e);
        }
    };

    // 번역 함수
    const t = (key: string, params?: Record<string, string>): string => {
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 키를 찾지 못하면 한국어로 폴백
                value = translations['ko'];
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey];
                    } else {
                        return key; // 한국어에도 없으면 키 자체 반환
                    }
                }
                break;
            }
        }

        if (typeof value !== 'string') {
            return key;
        }

        // 파라미터 치환 (예: {{name}} -> 실제 값)
        if (params) {
            return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => params[paramKey] || '');
        }

        return value;
    };

    if (!isLoaded) {
        return null; // 로딩 중
    }

    return (
        <I18nContext.Provider value={{ language, t, setLanguage, languages }}>
            {children}
        </I18nContext.Provider>
    );
}

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};

// 편의를 위한 t 함수 단독 export (Context 외부에서 사용 불가)
export default I18nContext;
