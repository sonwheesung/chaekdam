import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, BackHandler, useColorScheme, View } from 'react-native';

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

  // 안드로이드 하드웨어 뒤로가기: 갈 화면이 있으면 정상 뒤로가기,
  // 루트(더 갈 곳 없음)에서는 종료 확인 다이얼로그
  useEffect(() => {
    const onBack = () => {
      if (router.canGoBack()) {
        return false; // 기본 동작(뒤로가기)에 맡김
      }
      Alert.alert('앱 종료', '앱을 닫으시겠어요?', [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true; // 기본 종료 동작 막고 다이얼로그로 대체
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

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
          <Stack.Screen name="review/ocr" options={{ headerShown: true, title: '문장 추출' }} />
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
