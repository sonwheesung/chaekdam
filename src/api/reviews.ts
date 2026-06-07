import type { ProfileBrief } from '@/api/friends';
import { supabase } from '@/lib/supabase';

export type ReviewListItem = {
  id: string;
  book_id: string;
  user_id: string;
  quoted_text: string | null;
  page_number: number | null;
  chapter: string | null;
  content: string;
  created_at: string;
  author: ProfileBrief;
  images: string[];
  likeCount: number;
  commentCount: number;
};

export type ReviewDetail = ReviewListItem;

type CountAgg = { count: number }[];
const countOf = (a?: CountAgg) => a?.[0]?.count ?? 0;

const REVIEW_SELECT =
  'id,book_id,user_id,quoted_text,page_number,chapter,content,created_at,' +
  'author:profiles!reviews_user_id_fkey(id,username,display_name,avatar_url),' +
  'review_images(image_url,sort_order),likes(count),comments(count)';

type RawReview = {
  id: string;
  book_id: string;
  user_id: string;
  quoted_text: string | null;
  page_number: number | null;
  chapter: string | null;
  content: string;
  created_at: string;
  author: ProfileBrief;
  review_images: { image_url: string; sort_order: number }[];
  likes: CountAgg;
  comments: CountAgg;
};

function normalize(r: RawReview): ReviewListItem {
  return {
    id: r.id,
    book_id: r.book_id,
    user_id: r.user_id,
    quoted_text: r.quoted_text,
    page_number: r.page_number,
    chapter: r.chapter,
    content: r.content,
    created_at: r.created_at,
    author: r.author,
    images: [...(r.review_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.image_url),
    likeCount: countOf(r.likes),
    commentCount: countOf(r.comments),
  };
}

export async function fetchReviewsByBook(
  bookId: string,
): Promise<{ data: ReviewListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .returns<RawReview[]>();
  return { data: (data ?? []).map(normalize), error: error?.message ?? null };
}

export async function fetchReview(
  id: string,
): Promise<{ data: ReviewDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('id', id)
    .maybeSingle()
    .returns<RawReview>();
  return { data: data ? normalize(data) : null, error: error?.message ?? null };
}

export async function createReview(input: {
  bookId: string;
  quotedText?: string | null;
  pageNumber?: number | null;
  chapter?: string | null;
  content: string;
  imageUrls?: string[];
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { data: null, error: '로그인이 필요합니다.' };

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      book_id: input.bookId,
      user_id: me,
      quoted_text: input.quotedText ?? null,
      page_number: input.pageNumber ?? null,
      chapter: input.chapter ?? null,
      content: input.content,
    })
    .select('id')
    .single()
    .returns<{ id: string }>();
  if (error || !review) return { data: null, error: error?.message ?? '작성 실패' };

  const urls = input.imageUrls ?? [];
  if (urls.length > 0) {
    const rows = urls.map((url, i) => ({ review_id: review.id, image_url: url, sort_order: i }));
    const { error: imgErr } = await supabase.from('review_images').insert(rows);
    if (imgErr) return { data: review, error: `이미지 저장 실패: ${imgErr.message}` };
  }
  return { data: review, error: null };
}

export async function deleteReview(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  return { error: error?.message ?? null };
}
