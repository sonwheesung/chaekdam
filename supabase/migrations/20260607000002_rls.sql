-- 책담 RLS: 헬퍼 함수 + 정책 + RPC
-- 기본 원칙(스펙 §3, §5): "내가 멤버인 책의 데이터만 읽기/쓰기 가능", 작성물 수정/삭제는 본인만.

-- ═════════════════════════════════════════════════════════════
-- SECURITY DEFINER 헬퍼 함수
--   RLS 정책 안에서 book_members 를 직접 참조하면 무한 재귀가 발생하므로,
--   definer 권한으로 RLS 를 우회해 멤버십/친구 여부를 확인하는 함수로 감싼다.
-- ═════════════════════════════════════════════════════════════

create or replace function public.is_book_member(p_book_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book_id and m.user_id = p_uid
  );
$$;

create or replace function public.is_book_owner(p_book_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book_id and m.user_id = p_uid and m.role = 'owner'
  );
$$;

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ( (f.requester_id = p_a and f.addressee_id = p_b)
         or (f.requester_id = p_b and f.addressee_id = p_a) )
  );
$$;

-- 같은 review 의 책에 내가 멤버인지 (review_images/comments/likes 정책용)
create or replace function public.can_access_review(p_review_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reviews r
    join public.book_members m on m.book_id = r.book_id
    where r.id = p_review_id and m.user_id = p_uid
  );
$$;

create or replace function public.is_review_author(p_review_id uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.reviews r
    where r.id = p_review_id and r.user_id = p_uid
  );
$$;

-- ═════════════════════════════════════════════════════════════
-- RLS 활성화
-- ═════════════════════════════════════════════════════════════
alter table public.profiles              enable row level security;
alter table public.friendships           enable row level security;
alter table public.books                 enable row level security;
alter table public.book_members          enable row level security;
alter table public.book_invitations      enable row level security;
alter table public.reviews               enable row level security;
alter table public.review_images         enable row level security;
alter table public.comments              enable row level security;
alter table public.likes                 enable row level security;
alter table public.notifications         enable row level security;
alter table public.notification_settings enable row level security;
alter table public.push_tokens           enable row level security;

-- ───────────────── profiles ─────────────────
-- 사용자 검색을 위해 모든 인증 사용자가 프로필 조회 가능.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ───────────────── friendships ─────────────────
create policy friendships_select on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid());
-- 양측 모두 상태 변경 가능(수락/거절/차단/취소)
create policy friendships_update on public.friendships
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_delete on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ───────────────── books ─────────────────
-- 멤버이거나, 생성자이거나, 나에게 온 초대가 있는 책(초대 미리보기용)만 조회.
create policy books_select on public.books
  for select to authenticated
  using (
    public.is_book_member(id, auth.uid())
    or created_by = auth.uid()
    or exists (
      select 1 from public.book_invitations bi
      where bi.book_id = id and bi.invitee_id = auth.uid()
    )
  );
create policy books_insert on public.books
  for insert to authenticated with check (created_by = auth.uid());
create policy books_update on public.books
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy books_delete on public.books
  for delete to authenticated using (created_by = auth.uid());

-- ───────────────── book_members ─────────────────
-- 조회: 내가 멤버인 책의 멤버 목록. (insert 는 트리거/RPC(definer)로만 생성)
create policy book_members_select on public.book_members
  for select to authenticated
  using (public.is_book_member(book_id, auth.uid()));
-- 탈퇴(본인) 또는 소유자가 멤버 제거.
create policy book_members_delete on public.book_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_book_owner(book_id, auth.uid()));

-- ───────────────── book_invitations ─────────────────
create policy book_invitations_select on public.book_invitations
  for select to authenticated
  using (invitee_id = auth.uid() or inviter_id = auth.uid());
-- 초대 생성: 본인이 초대자 ∧ 해당 책 멤버 ∧ 초대 대상과 친구.
create policy book_invitations_insert on public.book_invitations
  for insert to authenticated
  with check (
    inviter_id = auth.uid()
    and public.is_book_member(book_id, auth.uid())
    and public.are_friends(auth.uid(), invitee_id)
  );
-- 거절 등 상태변경은 초대 대상 본인. (수락은 accept_book_invitation RPC 사용 권장)
create policy book_invitations_update on public.book_invitations
  for update to authenticated
  using (invitee_id = auth.uid()) with check (invitee_id = auth.uid());
create policy book_invitations_delete on public.book_invitations
  for delete to authenticated using (inviter_id = auth.uid());

-- ───────────────── reviews ─────────────────
create policy reviews_select on public.reviews
  for select to authenticated
  using (public.is_book_member(book_id, auth.uid()));
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_book_member(book_id, auth.uid()));
create policy reviews_update on public.reviews
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete on public.reviews
  for delete to authenticated using (user_id = auth.uid());

-- ───────────────── review_images ─────────────────
create policy review_images_select on public.review_images
  for select to authenticated
  using (public.can_access_review(review_id, auth.uid()));
create policy review_images_insert on public.review_images
  for insert to authenticated
  with check (public.is_review_author(review_id, auth.uid()));
create policy review_images_delete on public.review_images
  for delete to authenticated
  using (public.is_review_author(review_id, auth.uid()));

-- ───────────────── comments ─────────────────
create policy comments_select on public.comments
  for select to authenticated
  using (public.can_access_review(review_id, auth.uid()));
create policy comments_insert on public.comments
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_review(review_id, auth.uid()));
create policy comments_update on public.comments
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete on public.comments
  for delete to authenticated using (user_id = auth.uid());

-- ───────────────── likes ─────────────────
create policy likes_select on public.likes
  for select to authenticated
  using (public.can_access_review(review_id, auth.uid()));
create policy likes_insert on public.likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_review(review_id, auth.uid()));
create policy likes_delete on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- ───────────────── notifications ─────────────────
-- 인서트는 Edge Function(service_role, RLS 우회)이 담당 → 클라이언트 insert 정책 없음.
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ───────────────── notification_settings ─────────────────
create policy notification_settings_select on public.notification_settings
  for select to authenticated using (user_id = auth.uid());
create policy notification_settings_insert on public.notification_settings
  for insert to authenticated with check (user_id = auth.uid());
create policy notification_settings_update on public.notification_settings
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────── push_tokens ─────────────────
create policy push_tokens_all on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═════════════════════════════════════════════════════════════
-- RPC: 책 초대 수락 (상태 변경 + 멤버 합류를 원자적으로)
-- ═════════════════════════════════════════════════════════════
create or replace function public.accept_book_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.book_invitations%rowtype;
begin
  select * into inv from public.book_invitations where id = p_invitation;
  if inv.id is null then
    raise exception '초대를 찾을 수 없습니다.';
  end if;
  if inv.invitee_id <> auth.uid() then
    raise exception '본인에게 온 초대만 수락할 수 있습니다.';
  end if;
  if inv.status <> 'pending' then
    raise exception '이미 처리된 초대입니다.';
  end if;

  update public.book_invitations set status = 'accepted' where id = p_invitation;

  insert into public.book_members (book_id, user_id, role)
  values (inv.book_id, inv.invitee_id, 'member')
  on conflict (book_id, user_id) do nothing;
end;
$$;

grant execute on function public.accept_book_invitation(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════
-- 권한: PostgREST authenticated 역할에 테이블 접근 권한 부여 (실제 접근은 위 RLS 로 게이트)
-- ═════════════════════════════════════════════════════════════
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
