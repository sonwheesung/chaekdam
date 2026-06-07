import { supabase } from '@/lib/supabase';

export type NotificationSettings = {
  user_id: string;
  push_enabled: boolean;
  night_enabled: boolean;
  night_start: string;
  night_end: string;
  comment_enabled: boolean;
  like_enabled: boolean;
};

export async function fetchNotificationSettings(): Promise<{
  data: NotificationSettings | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .maybeSingle()
    .returns<NotificationSettings>();
  return { data: data ?? null, error: error?.message ?? null };
}

export async function updateNotificationSettings(
  patch: Partial<Omit<NotificationSettings, 'user_id'>>,
): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { error: '로그인이 필요합니다.' };
  const { error } = await supabase.from('notification_settings').update(patch).eq('user_id', me);
  return { error: error?.message ?? null };
}
