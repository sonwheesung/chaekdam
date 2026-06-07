// 책담 푸시 발송 Edge Function (스펙 §E, §5)
//
// 트리거: notifications 테이블 INSERT 에 대한 Database Webhook 으로 호출되도록 설정.
//   (Supabase 대시보드 › Database › Webhooks → notifications INSERT → 이 함수 URL,
//    헤더에 service_role 키 또는 함수 시크릿)
//
// 배포: supabase functions deploy send-push
//   필요 env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (대시보드 functions secrets)
//
// 로직: 수신자의 notification_settings 확인 → push_enabled / 세분화(comment/like) /
//   야간 수신 여부를 반영 → push_tokens 로 Expo Push API 호출.
//   ※ 야간 판정은 서버 시각 기준(타임존 일관성은 추후 사용자 TZ 저장으로 개선 — 스펙 §5 주의).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotifType = 'new_review' | 'new_comment' | 'new_like' | 'invitation';
interface NotificationRow {
  id: string;
  user_id: string;
  type: NotifType;
  payload: { actor_name?: string; book_title?: string; book_id?: string; review_id?: string };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 야간 구간(자정 넘김 지원) 판정 — src/domain/notifications.ts 와 동일 규칙. */
function isWithinNightWindow(now: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function messageFor(n: NotificationRow): string {
  const actor = n.payload.actor_name ?? '누군가';
  const book = n.payload.book_title ? `"${n.payload.book_title}"` : '책';
  switch (n.type) {
    case 'new_review':
      return `${actor}님이 ${book}에 독후감을 남겼어요`;
    case 'new_comment':
      return `${actor}님이 회원님의 독후감에 댓글을 남겼어요`;
    case 'new_like':
      return `${actor}님이 회원님의 독후감을 좋아해요`;
    case 'invitation':
      return `${actor}님이 ${book}에 초대했어요`;
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record: NotificationRow = body.record ?? body;
    if (!record?.user_id) return new Response('no record', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', record.user_id)
      .maybeSingle();

    if (settings) {
      if (!settings.push_enabled) return new Response('push disabled');
      if (record.type === 'new_comment' && !settings.comment_enabled) return new Response('comment off');
      if (record.type === 'new_like' && !settings.like_enabled) return new Response('like off');
      if (!settings.night_enabled) {
        const now = new Date();
        // 서버 UTC → KST(+9) 보정 (사용자 TZ 저장 전 임시 기준)
        const kstMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + 9 * 60) % (24 * 60);
        if (
          isWithinNightWindow(
            kstMin,
            timeToMinutes(settings.night_start),
            timeToMinutes(settings.night_end),
          )
        ) {
          return new Response('night window - skipped');
        }
      }
    }

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', record.user_id);
    if (!tokens?.length) return new Response('no tokens');

    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title: '책담',
      body: messageFor(record),
      data: record.payload,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('sent');
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 });
  }
});
