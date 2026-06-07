import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

interface SignUpParams {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  /** 초기 세션 로딩이 끝났는지 (스플래시/게이트 분기용) */
  initialized: boolean;

  /** 세션 복원 + onAuthStateChange 구독. 반환값은 구독 해제 함수. */
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,

  initialize: () => {
    void supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        initialized: true,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, initialized: true });
    });

    return () => sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUp: async ({ email, password, username, displayName }) => {
    // username / display_name 은 user_metadata 로 전달 → DB 트리거(handle_new_user)가
    // profiles 행을 생성할 때 사용한다.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } },
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
