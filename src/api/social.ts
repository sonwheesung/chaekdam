import type { ProfileBrief } from '@/api/friends';
import { supabase } from '@/lib/supabase';

export type Comment = {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: ProfileBrief;
};

export async function fetchComments(
  reviewId: string,
): Promise<{ data: Comment[]; error: string | null }> {
  const { data, error } = await supabase
    .from('comments')
    .select(
      'id,review_id,user_id,content,created_at, author:profiles!comments_user_id_fkey(id,username,display_name,avatar_url)',
    )
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true })
    .returns<Comment[]>();
  return { data: data ?? [], error: error?.message ?? null };
}

export async function addComment(
  reviewId: string,
  content: string,
): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { error: '로그인이 필요합니다.' };
  const { error } = await supabase
    .from('comments')
    .insert({ review_id: reviewId, user_id: me, content });
  return { error: error?.message ?? null };
}

export async function deleteComment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** 좋아요 수 + 내가 눌렀는지. */
export async function fetchLikeStatus(
  reviewId: string,
): Promise<{ count: number; liked: boolean; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  const [{ count, error: cErr }, mine] = await Promise.all([
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('review_id', reviewId),
    me
      ? supabase.from('likes').select('id').eq('review_id', reviewId).eq('user_id', me).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  return { count: count ?? 0, liked: !!mine.data, error: cErr?.message ?? null };
}

/** 좋아요 토글 (현재 상태를 받아 반전). 사용자당 1회 unique 제약. */
export async function toggleLike(
  reviewId: string,
  currentlyLiked: boolean,
): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { error: '로그인이 필요합니다.' };
  if (currentlyLiked) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', me);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from('likes').insert({ review_id: reviewId, user_id: me });
  return { error: error?.message ?? null };
}
