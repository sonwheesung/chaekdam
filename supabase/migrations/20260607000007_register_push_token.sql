-- 로그인한 기기의 Expo 푸시 토큰을 현재 사용자로 등록/귀속.
-- 같은 기기 토큰을 다른 사용자가 갖고 있었다면 회수(로그인 유저에게 재귀속) — RLS상 남의 행은
-- 못 지우므로 SECURITY DEFINER 로 처리. 토큰 단위로만 영향.

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  -- 이 디바이스 토큰을 다른 사용자가 보유 중이면 회수
  delete from public.push_tokens
  where expo_push_token = p_token and user_id <> auth.uid();

  insert into public.push_tokens (user_id, expo_push_token, platform, updated_at)
  values (auth.uid(), p_token, coalesce(p_platform, 'android'), now())
  on conflict (user_id, expo_push_token)
  do update set platform = excluded.platform, updated_at = now();
end;
$$;

grant execute on function public.register_push_token(text, text) to authenticated;
