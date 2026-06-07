-- notifications INSERT 시 send-push Edge Function 호출 (pg_net 사용).
-- Supabase 내장 pg_net(net.http_post)으로 비동기 HTTP 호출 → 발송 실패해도 INSERT 영향 없음.
-- send-push 는 --no-verify-jwt 로 배포됨. body 의 record(알림 행)를 읽어 설정/야간/토큰 확인 후 발송.

create extension if not exists pg_net;

create or replace function public.call_send_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://hznouugdagnpclrostjl.functions.supabase.co/send-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

create trigger push_on_new_notification
  after insert on public.notifications
  for each row execute function public.call_send_push();
