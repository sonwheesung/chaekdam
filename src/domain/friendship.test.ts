import {
  areFriends,
  canInviteToBook,
  canSendFriendRequest,
  type FriendshipRow,
} from '@/domain/friendship';

const rows: FriendshipRow[] = [
  { requesterId: 'alice', addresseeId: 'bob', status: 'accepted' },
  { requesterId: 'carol', addresseeId: 'alice', status: 'pending' },
  { requesterId: 'dave', addresseeId: 'alice', status: 'blocked' },
];

describe('areFriends', () => {
  it('accepted 관계는 방향 무관하게 true', () => {
    expect(areFriends(rows, 'alice', 'bob')).toBe(true);
    expect(areFriends(rows, 'bob', 'alice')).toBe(true);
  });

  it('pending/blocked/없음은 false', () => {
    expect(areFriends(rows, 'alice', 'carol')).toBe(false);
    expect(areFriends(rows, 'alice', 'dave')).toBe(false);
    expect(areFriends(rows, 'alice', 'zoe')).toBe(false);
  });
});

describe('canSendFriendRequest', () => {
  it('자기 자신에게는 불가', () => {
    expect(canSendFriendRequest(rows, 'alice', 'alice')).toBe(false);
  });

  it('이미 관계가 있으면 불가', () => {
    expect(canSendFriendRequest(rows, 'alice', 'bob')).toBe(false);
    expect(canSendFriendRequest(rows, 'alice', 'carol')).toBe(false);
  });

  it('관계가 없으면 가능', () => {
    expect(canSendFriendRequest(rows, 'alice', 'zoe')).toBe(true);
  });
});

describe('canInviteToBook', () => {
  it('친구이고 초대자가 멤버면 가능', () => {
    expect(canInviteToBook(rows, 'alice', 'bob', true)).toBe(true);
  });

  it('친구가 아니면 불가', () => {
    expect(canInviteToBook(rows, 'alice', 'carol', true)).toBe(false);
  });

  it('초대자가 멤버가 아니면 불가', () => {
    expect(canInviteToBook(rows, 'alice', 'bob', false)).toBe(false);
  });
});
