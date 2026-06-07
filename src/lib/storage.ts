import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

/**
 * base64 이미지를 Storage 버킷의 `{userId}/...` 경로에 업로드하고 public URL 을 반환.
 * (Storage RLS: 본인 uid 폴더에만 쓰기 허용 — 0003_storage.sql)
 */
export async function uploadImageBase64(opts: {
  bucket: string;
  base64: string;
  userId: string;
  ext?: string;
  contentType?: string;
}): Promise<{ url: string | null; path: string | null; error: string | null }> {
  const ext = opts.ext ?? 'jpg';
  const contentType = opts.contentType ?? 'image/jpeg';
  // 같은 ms 충돌 방지를 위해 랜덤 접미사
  const rand = Math.floor(Math.random() * 1e6);
  const path = `${opts.userId}/${Date.now()}_${rand}.${ext}`;

  const { error } = await supabase.storage
    .from(opts.bucket)
    .upload(path, decode(opts.base64), { contentType, upsert: false });
  if (error) {
    return { url: null, path: null, error: error.message };
  }
  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, error: null };
}
