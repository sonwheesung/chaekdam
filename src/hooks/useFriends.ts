import { useCallback, useState } from 'react';

import { fetchFriendships, type FriendshipRecord, type ProfileBrief } from '@/api/friends';
import type { FriendshipRow } from '@/domain/friendship';
import { useAuthStore } from '@/stores/authStore';

/** friendship 레코드에서 "나"가 아닌 상대 프로필을 꺼낸다. */
export function otherProfile(record: FriendshipRecord, me: string): ProfileBrief {
  return record.requester_id === me ? record.addressee : record.requester;
}

/**
 * 나와 관련된 친구 관계를 로드하고 친구/받은요청/보낸요청으로 분류한다.
 * 자동 fetch 는 하지 않으므로 화면에서 useFocusEffect 등으로 refresh() 호출.
 */
export function useFriends() {
  const me = useAuthStore((s) => s.user?.id ?? '');
  const [records, setRecords] = useState<FriendshipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchFriendships();
    setRecords(data);
    setLoading(false);
  }, []);

  const friends = records.filter((r) => r.status === 'accepted');
  const incoming = records.filter((r) => r.status === 'pending' && r.addressee_id === me);
  const outgoing = records.filter((r) => r.status === 'pending' && r.requester_id === me);

  // 도메인 관계 분류용 (검색 결과 버튼 상태 계산)
  const domainRows: FriendshipRow[] = records.map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    addresseeId: r.addressee_id,
    status: r.status,
  }));

  return { me, records, friends, incoming, outgoing, domainRows, loading, refresh };
}
