import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { registerForPushNotifications } from '@/lib/push';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => initialize(), [initialize]);

  // 로그인(세션 생성) 시 이 기기의 푸시 토큰을 현재 사용자로 등록/귀속
  const userId = session?.user?.id;
  useEffect(() => {
    if (userId) registerForPushNotifications();
  }, [userId]);

  // 초기 세션 복원이 끝나기 전엔 로딩 표시 (로그인/탭 깜빡임 방지)
  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 로그인 상태에서만 접근 가능한 화면들 */}
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="book/[id]" options={{ headerShown: true, title: '책' }} />
          <Stack.Screen
            name="book/new"
            options={{ headerShown: true, title: '책 등록', presentation: 'modal' }}
          />
          <Stack.Screen
            name="review/new"
            options={{ headerShown: true, title: '독후감 작성', presentation: 'modal' }}
          />
          <Stack.Screen name="review/[id]" options={{ headerShown: true, title: '독후감' }} />
        </Stack.Protected>

        {/* 비로그인 상태 화면 */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
