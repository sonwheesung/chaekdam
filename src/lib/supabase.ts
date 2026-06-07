import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { ENV } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * 앱 전역에서 사용하는 단일 Supabase 클라이언트.
 * - 세션은 AsyncStorage 에 영속 저장
 * - detectSessionInUrl=false: React Native 에는 URL 세션 감지가 불필요
 */
export const supabase = createClient<Database>(ENV.supabaseUrl, ENV.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신 (Supabase RN 권장 패턴).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
