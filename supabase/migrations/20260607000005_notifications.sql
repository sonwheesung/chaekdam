-- 인앱 알림 자동 적재 트리거 (스펙 §E, §5).
-- notifications insert 는 RLS상 클라이언트 불가 → SECURITY DEFINER 트리거가 적재.
-- payload 는 클라이언트가 조인 없이 표시할 수 있도록 actor_name/book_title 등을 비정규화 저장.
-- 세분화 설정(comment_enabled/like_enabled)을 반영해 알림 생성 여부를 제어.

-- 새 독후감 → 같은 책 멤버 전원(작성자 제외)에게 알림
create or replace function public.notify_new_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor text;
  v_book_title text;
begin
  select display_name into v_actor from public.profiles where id = new.user_id;
  select title into v_book_title from public.books where id = new.book_id;
  insert into public.notifications (user_id, type, payload)
  select m.user_id, 'new_review',
    jsonb_build_object(
      'book_id', new.book_id, 'review_id', new.id,
      'actor_id', new.user_id, 'actor_name', v_actor, 'book_title', v_book_title
    )
  from public.book_members m
  where m.book_id = new.book_id and m.user_id <> new.user_id;
  return new;
end; $$;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.notify_new_review();

-- 새 댓글 → 독후감 작성자에게 알림(본인 제외, comment_enabled 존중)
create or replace function public.notify_new_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid; v_book uuid; v_actor text; v_book_title text; v_enabled boolean;
begin
  select user_id, book_id into v_author, v_book from public.reviews where id = new.review_id;
  if v_author is null or v_author = new.user_id then return new; end if;
  select comment_enabled into v_enabled from public.notification_settings where user_id = v_author;
  if coalesce(v_enabled, true) = false then return new; end if;
  select display_name into v_actor from public.profiles where id = new.user_id;
  select title into v_book_title from public.books where id = v_book;
  insert into public.notifications (user_id, type, payload)
  values (v_author, 'new_comment',
    jsonb_build_object(
      'book_id', v_book, 'review_id', new.review_id,
      'actor_id', new.user_id, 'actor_name', v_actor, 'book_title', v_book_title
    ));
  return new;
end; $$;

create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.notify_new_comment();

-- 새 좋아요 → 독후감 작성자에게 알림(본인 제외, like_enabled 존중)
create or replace function public.notify_new_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid; v_book uuid; v_actor text; v_book_title text; v_enabled boolean;
begin
  select user_id, book_id into v_author, v_book from public.reviews where id = new.review_id;
  if v_author is null or v_author = new.user_id then return new; end if;
  select like_enabled into v_enabled from public.notification_settings where user_id = v_author;
  if coalesce(v_enabled, true) = false then return new; end if;
  select display_name into v_actor from public.profiles where id = new.user_id;
  select title into v_book_title from public.books where id = v_book;
  insert into public.notifications (user_id, type, payload)
  values (v_author, 'new_like',
    jsonb_build_object(
      'book_id', v_book, 'review_id', new.review_id,
      'actor_id', new.user_id, 'actor_name', v_actor, 'book_title', v_book_title
    ));
  return new;
end; $$;

create trigger on_like_created
  after insert on public.likes
  for each row execute function public.notify_new_like();

-- 새 책 초대 → 초대 대상에게 알림
create or replace function public.notify_new_invitation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor text; v_book_title text;
begin
  select display_name into v_actor from public.profiles where id = new.inviter_id;
  select title into v_book_title from public.books where id = new.book_id;
  insert into public.notifications (user_id, type, payload)
  values (new.invitee_id, 'invitation',
    jsonb_build_object(
      'book_id', new.book_id, 'actor_id', new.inviter_id,
      'actor_name', v_actor, 'book_title', v_book_title
    ));
  return new;
end; $$;

create trigger on_invitation_created
  after insert on public.book_invitations
  for each row execute function public.notify_new_invitation();
