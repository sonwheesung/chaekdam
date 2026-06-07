import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  fetchBook,
  fetchBookMembers,
  fetchPendingInviteeIds,
  sendBookInvitation,
  type Book,
  type BookMember,
} from '@/api/books';
import { fetchFriendships, type ProfileBrief } from '@/api/friends';
import { fetchReviewsByBook, type ReviewListItem } from '@/api/reviews';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { otherProfile } from '@/hooks/useFriends';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const me = useAuthStore((s) => s.user?.id ?? '');

  const [book, setBook] = useState<Book | null>(null);
  const [members, setMembers] = useState<BookMember[]>([]);
  const [invitable, setInvitable] = useState<ProfileBrief[]>([]);
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [b, m, fr, pend, rv] = await Promise.all([
      fetchBook(id),
      fetchBookMembers(id),
      fetchFriendships(),
      fetchPendingInviteeIds(id),
      fetchReviewsByBook(id),
    ]);
    setBook(b.data);
    setMembers(m.data);
    setReviews(rv.data);
    const memberIds = new Set(m.data.map((x) => x.user_id));
    const pendingIds = new Set(pend.data);
    const friends = fr.data
      .filter((f) => f.status === 'accepted')
      .map((f) => otherProfile(f, me));
    setInvitable(friends.filter((p) => !memberIds.has(p.id) && !pendingIds.has(p.id)));
    setLoading(false);
  }, [id, me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onInvite(pid: string) {
    const { error } = await sendBookInvitation(id, pid);
    if (error) Alert.alert('초대 실패', error);
    load();
  }

  if (loading && !book) {
    return (
      <Screen center>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }
  if (!book) {
    return (
      <Screen center padded>
        <ThemedText>책을 찾을 수 없습니다.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen scroll padded contentStyle={styles.content}>
      {/* 책 정보 */}
      <View style={styles.header}>
        {book.cover_url ? (
          <Image source={{ uri: book.cover_url }} style={styles.cover} />
        ) : (
          <ThemedView type="backgroundElement" style={[styles.cover, styles.coverEmpty]}>
            <ThemedText type="small" themeColor="textSecondary">
              📖
            </ThemedText>
          </ThemedView>
        )}
        <View style={styles.headerText}>
          <ThemedText type="subtitle" numberOfLines={3}>
            {book.title}
          </ThemedText>
          {book.author ? (
            <ThemedText type="small" themeColor="textSecondary">
              {book.author}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push({ pathname: '/review/new', params: { bookId: id } })}
      >
        <ThemedText style={styles.buttonText}>독후감 쓰기</ThemedText>
      </TouchableOpacity>

      {/* 멤버 */}
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          멤버 ({members.length})
        </ThemedText>
        {members.map((m) => (
          <View key={m.id} style={styles.row}>
            <Avatar name={m.user?.display_name ?? '?'} />
            <View style={styles.rowText}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {m.user?.display_name}
                {m.role === 'owner' ? ' 👑' : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                @{m.user?.username}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      {/* 친구 초대 (친구만) */}
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          친구 초대
        </ThemedText>
        {invitable.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            초대할 수 있는 친구가 없습니다. (이미 멤버이거나 초대됨)
          </ThemedText>
        ) : (
          invitable.map((p) => (
            <View key={p.id} style={styles.row}>
              <Avatar name={p.display_name} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {p.display_name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  @{p.username}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.pillPrimary} onPress={() => onInvite(p.id)}>
                <ThemedText style={styles.pillText}>초대</ThemedText>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* 독후감 피드 */}
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          독후감 ({reviews.length})
        </ThemedText>
        {reviews.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            아직 독후감이 없습니다. "독후감 쓰기"로 첫 글을 남겨보세요.
          </ThemedText>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </View>
    </Screen>
  );
}

function ReviewCard({ review }: { review: ReviewListItem }) {
  const location =
    review.page_number != null
      ? `p.${review.page_number}`
      : review.chapter
        ? review.chapter
        : null;
  return (
    <TouchableOpacity onPress={() => router.push(`/review/${review.id}`)}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHead}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.cardAuthor}>
            {review.author?.display_name ?? '알 수 없음'}
          </ThemedText>
          {location ? (
            <ThemedText type="small" themeColor="textSecondary">
              {location}
            </ThemedText>
          ) : null}
        </View>
        {review.quoted_text ? (
          <ThemedText type="small" style={styles.quote} numberOfLines={3}>
            “{review.quoted_text}”
          </ThemedText>
        ) : null}
        <ThemedText type="small" numberOfLines={3}>
          {review.content}
        </ThemedText>
        <View style={styles.cardMeta}>
          {review.images.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              🖼 {review.images.length}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            ♥ {review.likeCount}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            💬 {review.commentCount}
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.avatar}>
      <ThemedText type="smallBold">{name.trim().charAt(0) || '?'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingBottom: Spacing.five },
  header: { flexDirection: 'row', gap: Spacing.three },
  headerText: { flex: 1, gap: Spacing.one, justifyContent: 'center' },
  cover: { width: 96, height: 128, borderRadius: Spacing.two },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  button: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  section: { gap: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { paddingVertical: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  rowText: { flex: 1, gap: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pillPrimary: { backgroundColor: '#3c87f7', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  pillText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  cardAuthor: { flex: 1 },
  quote: { fontStyle: 'italic' },
  cardMeta: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.one },
});
