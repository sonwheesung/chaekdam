-- 책담(冊談) 초기 스키마: 테이블 + 인덱스 + 트리거
-- 스펙 §3 데이터 모델 참조. RLS 정책은 0002_rls.sql 에서 적용.

-- ─────────────────────────────────────────────────────────────
-- profiles : auth.users 1:1 확장
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique not null,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- friendships : 친구 관계 (단방향 행, 조회는 양방향)
-- ─────────────────────────────────────────────────────────────
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'blocked')),
  created_at   timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);
create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

-- ─────────────────────────────────────────────────────────────
-- books : 등록된 책
-- ─────────────────────────────────────────────────────────────
create table public.books (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  author     text,
  cover_url  text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index books_created_by_idx on public.books (created_by);

-- ─────────────────────────────────────────────────────────────
-- book_members : 책을 공유 중인 사람
-- ─────────────────────────────────────────────────────────────
create table public.book_members (
  id       uuid primary key default gen_random_uuid(),
  book_id  uuid not null references public.books (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  role     text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  constraint book_members_unique unique (book_id, user_id)
);
create index book_members_book_idx on public.book_members (book_id);
create index book_members_user_idx on public.book_members (user_id);

-- ─────────────────────────────────────────────────────────────
-- book_invitations : 책 멤버 초대
-- ─────────────────────────────────────────────────────────────
create table public.book_invitations (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint book_invitations_unique unique (book_id, invitee_id)
);
create index book_invitations_invitee_idx on public.book_invitations (invitee_id);
create index book_invitations_book_idx on public.book_invitations (book_id);

-- ─────────────────────────────────────────────────────────────
-- reviews : 독후감
-- ─────────────────────────────────────────────────────────────
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  quoted_text text,                 -- OCR 추출/편집 인용 문장
  page_number int,
  chapter     text,                 -- 페이지 또는 단원 중 택1
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index reviews_book_idx on public.reviews (book_id);
create index reviews_user_idx on public.reviews (user_id);

-- ─────────────────────────────────────────────────────────────
-- review_images : 독후감 첨부 이미지 (여러 장)
-- ─────────────────────────────────────────────────────────────
create table public.review_images (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  image_url  text not null,
  sort_order int not null default 0
);
create index review_images_review_idx on public.review_images (review_id);

-- ─────────────────────────────────────────────────────────────
-- comments : 독후감 댓글
-- ─────────────────────────────────────────────────────────────
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
create index comments_review_idx on public.comments (review_id);

-- ─────────────────────────────────────────────────────────────
-- likes : 좋아요 (사용자당 1회)
-- ─────────────────────────────────────────────────────────────
create table public.likes (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_unique unique (review_id, user_id)
);
create index likes_review_idx on public.likes (review_id);

-- ─────────────────────────────────────────────────────────────
-- notifications : 인앱 알림
-- ─────────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,  -- 받는 사람
  type       text not null
               check (type in ('new_review', 'new_comment', 'new_like', 'invitation')),
  payload    jsonb not null default '{}'::jsonb,  -- { book_id, review_id, actor_id ... }
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read);

-- ─────────────────────────────────────────────────────────────
-- notification_settings : 알림 설정 (사용자당 1행)
-- ─────────────────────────────────────────────────────────────
create table public.notification_settings (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  push_enabled    boolean not null default true,
  night_enabled   boolean not null default false,  -- 야간 알림 수신 여부
  night_start     time not null default '22:00',
  night_end       time not null default '08:00',
  comment_enabled boolean not null default true,
  like_enabled    boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- push_tokens : Expo 푸시 토큰
-- ─────────────────────────────────────────────────────────────
create table public.push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform        text check (platform in ('ios', 'android')),
  updated_at      timestamptz not null default now(),
  constraint push_tokens_unique unique (user_id, expo_push_token)
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ═════════════════════════════════════════════════════════════
-- 트리거 함수
-- ═════════════════════════════════════════════════════════════

-- 신규 auth.users 생성 시 profiles + notification_settings 기본 행 생성.
-- username/display_name 은 회원가입 시 넘긴 user_metadata 에서 가져온다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display  text;
begin
  v_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8)
  );
  v_display := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    v_username
  );

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display);

  insert into public.notification_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 책 생성 시 생성자를 owner 멤버로 자동 등록.
create or replace function public.add_book_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.book_members (book_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_book_created
  after insert on public.books
  for each row execute function public.add_book_owner();

-- reviews.updated_at 자동 갱신.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();
