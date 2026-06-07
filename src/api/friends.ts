import { supabase } from '@/lib/supabase';

export type ProfileBrief = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type FriendshipRecord = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  requester: ProfileBrief;
  addressee: ProfileBrief;
};

// friendships 행 + 양쪽 프로필을 함께 조회 (FK alias 임베드)
const FRIENDSHIP_SELECT =
  '*, requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar_url),' +
  ' addressee:profiles!friendships_addressee_id_fkey(id,username,display_name,avatar_url)';

/** 나와 관련된 모든 친구 관계(친구/보낸요청/받은요청)를 프로필과 함께 조회. */
export async function fetchFriendships(): Promise<{
  data: FriendshipRecord[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .order('created_at', { ascending: false })
    .returns<FriendshipRecord[]>();
  return { data: data ?? [], error: error?.message ?? null };
}

/** 아이디(username)로 사용자 검색 (자기 자신 제외). */
export async function searchProfilesByUsername(
  query: string,
  excludeId: string,
): Promise<{ data: ProfileBrief[]; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', excludeId)
    .order('username')
    .limit(20)
    .returns<ProfileBrief[]>();
  return { data: data ?? [], error: error?.message ?? null };
}

/** 친구 요청 보내기 (requester=현재 사용자). */
export async function sendFriendRequest(addresseeId: string): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { error: '로그인이 필요합니다.' };
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: me, addressee_id: addresseeId, status: 'pending' });
  return { error: error?.message ?? null };
}

/** 받은 요청 수락. */
export async function acceptFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  return { error: error?.message ?? null };
}

/** 거절/취소/친구삭제 — friendship 행 제거 (RLS: 당사자만 가능). */
export async function removeFriendship(friendshipId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  return { error: error?.message ?? null };
}
