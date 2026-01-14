import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { OfflineQueueProvider } from '@/contexts/OfflineQueueContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { BiometricProvider } from '@/contexts/BiometricContext';
import { ToastProvider } from '@/contexts/ToastContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 내부 레이아웃 컴포넌트 (ThemeContext 사용 가능)
function RootLayoutContent() {
  const { isDark } = useTheme();

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <OfflineBanner />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen
            name="diary/create"
            options={{
              title: '새 일기 작성',
              headerBackTitle: '뒤로',
            }}
          />
          <Stack.Screen
            name="diary/[id]"
            options={{
              title: '일기 상세',
              headerBackTitle: '뒤로',
            }}
          />
          <Stack.Screen
            name="diary/edit/[id]"
            options={{
              title: '일기 수정',
              headerBackTitle: '뒤로',
            }}
          />
        </Stack>
      </View>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <OfflineQueueProvider>
              <BiometricProvider>
                <ToastProvider>
                  <RootLayoutContent />
                </ToastProvider>
              </BiometricProvider>
            </OfflineQueueProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

