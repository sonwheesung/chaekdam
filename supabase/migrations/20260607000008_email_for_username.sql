-- 아이디(username) 로그인 지원.
-- Supabase Auth는 이메일/전화로만 비번 로그인이 가능하므로, 아이디 → 이메일을 조회하는
-- RPC가 필요. 비로그인(anon) 단계에서 호출되므로 SECURITY DEFINER 로 auth.users 를 읽는다.
-- (username→email 매핑이 노출되는 트레이드오프가 있으나 아이디 로그인을 위해 허용)

create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = p_username
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;
