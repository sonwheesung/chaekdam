import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import {
  searchProfilesByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  type ProfileBrief,
} from '@/api/friends';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { relationForUser } from '@/domain/friendship';
import { useTheme } from '@/hooks/use-theme';
import { otherProfile, useFriends } from '@/hooks/useFriends';

type TabKey = 'friends' | 'incoming';

export default function FriendsScreen() {
  const theme = useTheme();
  const { me, friends, incoming, domainRows, refresh } = useFriends();

  const [tab, setTab] = useState<TabKey>('friends');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileBrief[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function onSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    const { data, error } = await searchProfilesByUsername(q, me);
    setSearching(false);
    setSearched(true);
    if (error) {
      Alert.alert('검색 오류', error);
      return;
    }
    setResults(data);
  }

  // 액션 실행 후 목록 갱신 (검색 결과 버튼 상태도 records 기준으로 자동 갱신)
  async function run(p: Promise<{ error: string | null }>, errTitle: string) {
    const { error } = await p;
    if (error) Alert.alert(errTitle, error);
    await refresh();
  }

  function searchResultAction(profile: ProfileBrief): ReactNode {
    const rel = relationForUser(domainRows, me, profile.id);
    switch (rel.kind) {
      case 'friends':
        return <Pill label="친구" disabled />;
      case 'request_sent':
        return (
          <Pill
            label="요청 취소"
            variant="outline"
            onPress={() => rel.friendshipId && run(removeFriendship(rel.friendshipId), '취소 실패')}
          />
        );
      case 'request_received':
        return (
          <Pill
            label="수락"
            onPress={() => rel.friendshipId && run(acceptFriendRequest(rel.friendshipId), '수락 실패')}
          />
        );
      case 'blocked':
        return <Pill label="차단됨" disabled />;
      default:
        return <Pill label="친구 요청" onPress={() => run(sendFriendRequest(profile.id), '요청 실패')} />;
    }
  }

  function confirmRemoveFriend(id: string) {
    Alert.alert('친구 삭제', '정말 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => run(removeFriendship(id), '삭제 실패') },
    ]);
  }

  return (
    <Screen scroll padded contentStyle={styles.content}>
      {/* 검색 */}
      <View style={[styles.searchRow, { borderColor: theme.backgroundSelected }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="아이디로 친구 검색"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch} disabled={searching}>
          <ThemedText style={styles.searchBtnText}>{searching ? '검색중…' : '검색'}</ThemedText>
        </TouchableOpacity>
      </View>

      {/* 검색 결과 */}
      {searched && (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            검색 결과
          </ThemedText>
          {results.length === 0 ? (
            <Empty text="일치하는 아이디가 없습니다." />
          ) : (
            results.map((p) => <PersonRow key={p.id} profile={p} right={searchResultAction(p)} />)
          )}
        </View>
      )}

      {/* 토글: 내 친구 / 받은 요청 */}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'friends', label: `내 친구 ${friends.length}` },
          { key: 'incoming', label: `받은 요청 ${incoming.length}` },
        ]}
      />

      {/* 선택된 탭의 목록 */}
      {tab === 'friends' ? (
        friends.length === 0 ? (
          <Empty text="아직 친구가 없습니다. 아이디로 검색해 친구를 추가해 보세요." />
        ) : (
          friends.map((r) => (
            <PersonRow
              key={r.id}
              profile={otherProfile(r, me)}
              right={<Pill label="삭제" variant="outline" onPress={() => confirmRemoveFriend(r.id)} />}
            />
          ))
        )
      ) : incoming.length === 0 ? (
        <Empty text="받은 친구 요청이 없습니다." />
      ) : (
        incoming.map((r) => (
          <PersonRow
            key={r.id}
            profile={otherProfile(r, me)}
            right={
              <View style={styles.rowBtns}>
                <Pill label="수락" onPress={() => run(acceptFriendRequest(r.id), '수락 실패')} />
                <Pill
                  label="거절"
                  variant="outline"
                  onPress={() => run(removeFriendship(r.id), '거절 실패')}
                />
              </View>
            }
          />
        ))
      )}
    </Screen>
  );
}

// ───────── 하위 컴포넌트 ─────────

function Segmented({
  value,
  onChange,
  options,
}: {
  value: TabKey;
  onChange: (key: TabKey) => void;
  options: { key: TabKey; label: string }[];
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: theme.backgroundSelected }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(o.key)}
          >
            <ThemedText
              style={[styles.segmentText, active ? styles.segmentTextActive : { color: theme.textSecondary }]}
            >
              {o.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      {text}
    </ThemedText>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.avatar}>
      <ThemedText type="smallBold">{name.trim().charAt(0) || '?'}</ThemedText>
    </ThemedView>
  );
}

function PersonRow({ profile, right }: { profile: ProfileBrief; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar name={profile.display_name} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {profile.display_name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          @{profile.username}
        </ThemedText>
      </View>
      {right}
    </View>
  );
}

function Pill({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
}) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[
        styles.pill,
        isOutline ? styles.pillOutline : styles.pillPrimary,
        disabled && styles.pillDisabled,
      ]}
    >
      <ThemedText style={[styles.pillText, isOutline && styles.pillTextOutline]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  searchBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  searchBtnText: { color: '#3c87f7', fontWeight: '600', fontSize: 14 },

  section: { gap: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { paddingVertical: Spacing.three },

  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.one,
  },
  segmentActive: { backgroundColor: '#3c87f7' },
  segmentText: { fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#ffffff' },

  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  rowText: { flex: 1 },
  rowBtns: { flexDirection: 'row', gap: Spacing.two },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  pillPrimary: { backgroundColor: '#3c87f7' },
  pillOutline: { borderWidth: 1, borderColor: '#8b8d98' },
  pillDisabled: { backgroundColor: '#8b8d98', opacity: 0.6, borderWidth: 0 },
  pillText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  pillTextOutline: { color: '#8b8d98' },
});
