-- 회원가입(비로그인) 단계의 아이디 중복 확인용 RPC.
-- profiles SELECT 는 authenticated 만 허용되므로, anon 도 호출 가능한 SECURITY DEFINER 함수로
-- "사용 가능 여부(boolean)"만 노출한다. (행 데이터는 반환하지 않아 정보 노출 최소화)

create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = p_username
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
