-- 책담 Storage: 버킷 + 정책
-- 업로드 경로 규칙: "{auth.uid}/..." (첫 폴더 = 소유자 uid) → 본인 폴더에만 쓰기 허용.
-- avatars/book-covers/review-images 는 public read(공개 URL로 표시), page-photos 는 비공개(원본 보관).

insert into storage.buckets (id, name, public)
values
  ('avatars',       'avatars',       true),
  ('book-covers',   'book-covers',   true),
  ('review-images', 'review-images', true),
  ('page-photos',   'page-photos',   false)
on conflict (id) do nothing;

-- 쓰기/수정/삭제: 인증 사용자가 본인 uid 폴더 경로에만 가능 (4개 버킷 공통).
create policy "storage_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'book-covers', 'review-images', 'page-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'book-covers', 'review-images', 'page-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'book-covers', 'review-images', 'page-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 비공개 버킷(page-photos) 읽기: 소유자 본인만. (공개 버킷은 public URL 로 읽혀 별도 정책 불필요)
create policy "storage_page_photos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'page-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
