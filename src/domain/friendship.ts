/**
 * 친구 관계 정책 — 순수 함수. 스펙 §A(인증/친구), §B-5(친구만 초대) 참조.
 * DB 검증(RLS/RPC)과 별개로 클라이언트 UX 가드에 사용.
 */

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendshipRow {
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
}

/** 두 사용자 간 friendship 행을 방향 무관하게 찾는다. */
export function findFriendship(
  rows: FriendshipRow[],
  a: string,
  b: string,
): FriendshipRow | undefined {
  return rows.find(
    (r) =>
      (r.requesterId === a && r.addresseeId === b) ||
      (r.requesterId === b && r.addresseeId === a),
  );
}

/** 두 사용자가 친구(accepted)인지 — 양방향 판정. */
export function areFriends(rows: FriendshipRow[], a: string, b: string): boolean {
  return findFriendship(rows, a, b)?.status === 'accepted';
}

/**
 * 친구 요청을 새로 보낼 수 있는지.
 * - 자기 자신에게 불가
 * - 이미 관계(pending/accepted/blocked)가 있으면 불가
 */
export function canSendFriendRequest(
  rows: FriendshipRow[],
  from: string,
  to: string,
): boolean {
  if (from === to) return false;
  return findFriendship(rows, from, to) === undefined;
}

/**
 * 책 멤버 초대 가능 여부 (스펙 §A-3, §B-5: 친구로 등록된 사람만 초대).
 * @param inviterIsMember 초대자가 해당 책의 멤버/소유자인지
 */
export function canInviteToBook(
  friendships: FriendshipRow[],
  inviterId: string,
  inviteeId: string,
  inviterIsMember: boolean,
): boolean {
  if (!inviterIsMember) return false;
  if (inviterId === inviteeId) return false;
  return areFriends(friendships, inviterId, inviteeId);
}
