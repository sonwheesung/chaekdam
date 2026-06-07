import type { ProfileBrief } from '@/api/friends';
import { supabase } from '@/lib/supabase';

export type Book = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
};

export type BookMember = {
  id: string;
  book_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user: ProfileBrief;
};

export type BookInvitation = {
  id: string;
  book_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  book: Book;
  inviter: ProfileBrief;
};

/** 내가 멤버인 책 목록. */
export async function fetchMyBooks(): Promise<{ data: Book[]; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { data: [], error: '로그인이 필요합니다.' };
  const { data, error } = await supabase
    .from('book_members')
    .select('book:books(id,title,author,cover_url,created_by,created_at)')
    .eq('user_id', me)
    .order('joined_at', { ascending: false })
    .returns<{ book: Book }[]>();
  return { data: (data ?? []).map((r) => r.book).filter(Boolean), error: error?.message ?? null };
}

export async function fetchBook(id: string): Promise<{ data: Book | null; error: string | null }> {
  const { data, error } = await supabase
    .from('books')
    .select('id,title,author,cover_url,created_by,created_at')
    .eq('id', id)
    .maybeSingle()
    .returns<Book>();
  return { data: data ?? null, error: error?.message ?? null };
}

/** 책 등록 (created_by=현재 사용자, owner 멤버십은 트리거가 자동 생성). */
export async function createBook(input: {
  title: string;
  author?: string | null;
  coverUrl?: string | null;
}): Promise<{ data: Book | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { data: null, error: '로그인이 필요합니다.' };
  const { data, error } = await supabase
    .from('books')
    .insert({
      title: input.title,
      author: input.author ?? null,
      cover_url: input.coverUrl ?? null,
      created_by: me,
    })
    .select('id,title,author,cover_url,created_by,created_at')
    .single()
    .returns<Book>();
  return { data: data ?? null, error: error?.message ?? null };
}

export async function fetchBookMembers(
  bookId: string,
): Promise<{ data: BookMember[]; error: string | null }> {
  const { data, error } = await supabase
    .from('book_members')
    .select(
      'id,book_id,user_id,role,joined_at, user:profiles!book_members_user_id_fkey(id,username,display_name,avatar_url)',
    )
    .eq('book_id', bookId)
    .order('joined_at')
    .returns<BookMember[]>();
  return { data: data ?? [], error: error?.message ?? null };
}

/** 이 책의 (내가 보낸/받은) pending 초대의 invitee_id 목록 — 초대 가능 친구 필터용. */
export async function fetchPendingInviteeIds(
  bookId: string,
): Promise<{ data: string[]; error: string | null }> {
  const { data, error } = await supabase
    .from('book_invitations')
    .select('invitee_id,status')
    .eq('book_id', bookId)
    .eq('status', 'pending')
    .returns<{ invitee_id: string; status: string }[]>();
  return { data: (data ?? []).map((r) => r.invitee_id), error: error?.message ?? null };
}

export async function sendBookInvitation(
  bookId: string,
  inviteeId: string,
): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { error: '로그인이 필요합니다.' };
  const { error } = await supabase
    .from('book_invitations')
    .insert({ book_id: bookId, inviter_id: me, invitee_id: inviteeId, status: 'pending' });
  return { error: error?.message ?? null };
}

/** 나에게 온 pending 책 초대 (책/초대자 정보 포함). */
export async function fetchMyBookInvitations(): Promise<{
  data: BookInvitation[];
  error: string | null;
}> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { data: [], error: '로그인이 필요합니다.' };
  const { data, error } = await supabase
    .from('book_invitations')
    .select(
      '*, book:books(id,title,author,cover_url,created_by,created_at),' +
        ' inviter:profiles!book_invitations_inviter_id_fkey(id,username,display_name,avatar_url)',
    )
    .eq('invitee_id', me)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .returns<BookInvitation[]>();
  return { data: data ?? [], error: error?.message ?? null };
}

/** 책 초대 수락 (RPC: 상태변경 + 멤버 합류 원자 처리). */
export async function acceptBookInvitation(invitationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('accept_book_invitation', { p_invitation: invitationId });
  return { error: error?.message ?? null };
}

export async function declineBookInvitation(
  invitationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('book_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId);
  return { error: error?.message ?? null };
}
