import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

let registeredToken: string | null = null;

/**
 * 로그인한 기기의 Expo 푸시 토큰을 현재 사용자로 등록/귀속.
 * - 권한 요청 → Expo 푸시 토큰 발급 → register_push_token RPC(같은 기기 토큰을 현재 유저로 재귀속)
 * - Expo Go / 시뮬레이터 / EAS projectId 없음 등에서는 조용히 건너뜀(앱 동작에 영향 없음).
 *   실제 발송은 dev build + EAS 프로젝트가 있어야 동작 (DEV_BUILD.md).
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) return; // EAS 프로젝트 없으면 토큰 발급 불가

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    registeredToken = token;
    await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch (e) {
    // 푸시 미지원 환경(Expo Go 등)에서는 무시
    console.log('[push] 등록 건너뜀:', String(e));
  }
}

/** 로그아웃 시 이 기기의 토큰 제거 (RLS: 본인 행만). */
export async function unregisterPushToken(): Promise<void> {
  if (!registeredToken) return;
  try {
    await supabase.from('push_tokens').delete().eq('expo_push_token', registeredToken);
  } catch {
    // noop
  }
  registeredToken = null;
}
