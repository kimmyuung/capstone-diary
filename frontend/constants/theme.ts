/**
 * AI 감성 일기 앱 - 디자인 시스템
 * SNS 스타일의 감성적인 UI/UX
 */

import { Platform } from 'react-native';

// ============================================================================
// 🎨 감성 색상 팔레트 (Emotional Color Palette)
// ============================================================================

export const Palette = {
  // 프라이머리 - 따뜻한 코랄/피치 계열 (감성적)
  primary: {
    50: '#FFF5F3',
    100: '#FFE8E3',
    200: '#FFD4CC',
    300: '#FFB5A8',
    400: '#FF9080',
    500: '#FF6B6B',   // 메인 컬러
    600: '#E85555',
    700: '#C94040',
    800: '#A53333',
    900: '#872929',
  },

  // 세컨더리 - 부드러운 퍼플/라벤더 (차분함)
  secondary: {
    50: '#F8F5FF',
    100: '#EDE8FF',
    200: '#DDD4FF',
    300: '#C4B5FF',
    400: '#A890FF',
    500: '#8B6BFF',   // 보조 컬러
    600: '#7555E8',
    700: '#5F40C9',
    800: '#4D33A5',
    900: '#3F2987',
  },

  // 액센트 - 따뜻한 골드/피치
  accent: {
    peach: '#FFAB91',
    gold: '#FFD54F',
    coral: '#FF8A80',
    lavender: '#B388FF',
    mint: '#80CBC4',
    rose: '#F48FB1',
  },

  // 그라데이션
  gradient: {
    sunset: ['#FF6B6B', '#FFE66D'],      // 일몰
    dream: ['#8B6BFF', '#FF6B9D'],        // 꿈결
    morning: ['#FFB5A8', '#FFF5F3'],      // 아침 햇살
    ocean: ['#667EEA', '#764BA2'],        // 바다
    aurora: ['#A8EDEA', '#FED6E3'],       // 오로라
  },

  // 뉴트럴
  neutral: {
    white: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    black: '#121212',
  },

  // 상태 색상
  status: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },

  // 감정 색상 (일기 감정 표현용)
  emotion: {
    happy: '#FFD54F',      // 행복 - 노랑
    excited: '#FF7043',    // 신남 - 오렌지
    peaceful: '#81C784',   // 평온 - 초록
    sad: '#64B5F6',        // 슬픔 - 파랑
    angry: '#EF5350',      // 화남 - 빨강
    anxious: '#BA68C8',    // 불안 - 보라
    tired: '#90A4AE',      // 피곤 - 회색
    love: '#EC407A',       // 사랑 - 핑크
  },
};

// ============================================================================
// 🔤 폰트 시스템
// ============================================================================

export const Fonts = Platform.select({
  ios: {
    thin: 'System',
    light: 'System',
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    // 감성적인 폰트
    rounded: 'ui-rounded',
    serif: 'Georgia',
    mono: 'Menlo',
  },
  android: {
    thin: 'Roboto-Thin',
    light: 'Roboto-Light',
    regular: 'Roboto-Regular',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
    rounded: 'Roboto-Regular',
    serif: 'serif',
    mono: 'monospace',
  },
  default: {
    thin: 'normal',
    light: 'normal',
    regular: 'normal',
    medium: 'normal',
    semibold: '600',
    bold: 'bold',
    rounded: 'normal',
    serif: 'serif',
    mono: 'monospace',
  },
});

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const FontWeight = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

// ============================================================================
// 📏 스페이싱 & 레이아웃
// ============================================================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ============================================================================
// 🌙 라이트/다크 모드 테마
// ============================================================================

const tintColorLight = Palette.primary[500];
const tintColorDark = Palette.primary[400];

export const Colors = {
  light: {
    text: Palette.neutral[900],
    textSecondary: Palette.neutral[600],
    textMuted: Palette.neutral[500],
    background: '#FFFBFA',  // 따뜻한 화이트
    backgroundSecondary: Palette.neutral[50],
    card: Palette.neutral.white,
    border: Palette.neutral[200],
    tint: tintColorLight,
    icon: Palette.neutral[600],
    tabIconDefault: Palette.neutral[400],
    tabIconSelected: tintColorLight,
    primary: Palette.primary[500],
    secondary: Palette.secondary[500],
  },
  dark: {
    text: Palette.neutral[50],
    textSecondary: Palette.neutral[400],
    textMuted: Palette.neutral[500],
    background: '#1A1A1F',  // 부드러운 다크
    backgroundSecondary: '#242429',
    card: '#2A2A30',
    border: '#3A3A42',
    tint: tintColorDark,
    icon: Palette.neutral[400],
    tabIconDefault: Palette.neutral[500],
    tabIconSelected: tintColorDark,
    primary: Palette.primary[400],
    secondary: Palette.secondary[400],
  },
};

// ============================================================================
// 🎭 그림자 (iOS/Android 호환)
// ============================================================================

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};

// ============================================================================
// 🧩 공통 스타일 컴포넌트
// ============================================================================

export const CommonStyles = {
  // 카드 스타일
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },

  // 버튼 스타일
  buttonPrimary: {
    backgroundColor: Palette.primary[500],
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  buttonSecondary: {
    backgroundColor: Palette.secondary[500],
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // 입력 필드 스타일
  input: {
    backgroundColor: Palette.neutral[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Palette.neutral[200],
  },

  // 그라데이션 배경용 색상
  gradientBackground: Palette.gradient.morning,
};

export default {
  Palette,
  Colors,
  Fonts,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadows,
  CommonStyles,
};
