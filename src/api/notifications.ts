import { supabase } from '@/lib/supabase';

export type NotificationType = 'new_review' | 'new_comment' | 'new_like' | 'invitation';

export type NotificationPayload = {
  book_id?: string;
  review_id?: string;
  actor_id?: string;
  actor_name?: string;
  book_title?: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  is_read: boolean;
  created_at: string;
};

export async function fetchNotifications(): Promise<{
  data: AppNotification[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,user_id,type,payload,is_read,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<AppNotification[]>();
  return { data: data ?? [], error: error?.message ?? null };
}

export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { error: '로그인이 필요합니다.' };
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', me)
    .eq('is_read', false);
  return { error: error?.message ?? null };
}

/** 알림 메시지 문구 생성. */
export function notificationMessage(n: AppNotification): string {
  const actor = n.payload.actor_name ?? '누군가';
  const book = n.payload.book_title ? `"${n.payload.book_title}"` : '책';
  switch (n.type) {
    case 'new_review':
      return `${actor}님이 ${book}에 독후감을 남겼어요`;
    case 'new_comment':
      return `${actor}님이 회원님의 독후감에 댓글을 남겼어요`;
    case 'new_like':
      return `${actor}님이 회원님의 독후감을 좋아해요`;
    case 'invitation':
      return `${actor}님이 ${book}에 초대했어요`;
    default:
      return '새 알림';
  }
}
