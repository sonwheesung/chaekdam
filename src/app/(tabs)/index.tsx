import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  acceptBookInvitation,
  declineBookInvitation,
  fetchMyBookInvitations,
  fetchMyBooks,
  type Book,
  type BookInvitation,
} from '@/api/books';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function BooksScreen() {
  const theme = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [invitations, setInvitations] = useState<BookInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, inv] = await Promise.all([fetchMyBooks(), fetchMyBookInvitations()]);
    setBooks(b.data);
    setInvitations(inv.data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onAccept(id: string) {
    const { error } = await acceptBookInvitation(id);
    if (error) Alert.alert('수락 실패', error);
    load();
  }
  async function onDecline(id: string) {
    const { error } = await declineBookInvitation(id);
    if (error) Alert.alert('거절 실패', error);
    load();
  }

  return (
    <Screen scroll padded contentStyle={styles.content}>
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/book/new')}>
        <ThemedText style={styles.addBtnText}>+ 책 등록</ThemedText>
      </TouchableOpacity>

      {invitations.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            받은 초대 ({invitations.length})
          </ThemedText>
          {invitations.map((inv) => (
            <View key={inv.id} style={styles.inviteRow}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {inv.book?.title ?? '(삭제된 책)'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {inv.inviter?.display_name} 님의 초대
                </ThemedText>
              </View>
              <View style={styles.rowBtns}>
                <TouchableOpacity style={styles.pillPrimary} onPress={() => onAccept(inv.id)}>
                  <ThemedText style={styles.pillText}>수락</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pillOutline, { borderColor: theme.backgroundSelected }]}
                  onPress={() => onDecline(inv.id)}
                >
                  <ThemedText type="small">거절</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          내 책장
        </ThemedText>
        {loading ? (
          <ActivityIndicator style={{ marginTop: Spacing.four }} />
        ) : books.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            아직 책이 없습니다. "+ 책 등록"으로 첫 책을 추가해 보세요.
          </ThemedText>
        ) : (
          books.map((book) => (
            <TouchableOpacity
              key={book.id}
              style={styles.bookRow}
              onPress={() => router.push(`/book/${book.id}`)}
            >
              {book.cover_url ? (
                <Image source={{ uri: book.cover_url }} style={styles.cover} />
              ) : (
                <ThemedView type="backgroundElement" style={[styles.cover, styles.coverEmpty]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    📖
                  </ThemedText>
                </ThemedView>
              )}
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {book.title}
                </ThemedText>
                {book.author ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {book.author}
                  </ThemedText>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingBottom: Spacing.five },
  addBtn: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  addBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  section: { gap: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { paddingVertical: Spacing.three },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  rowText: { flex: 1, gap: 2 },
  rowBtns: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  bookRow: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center' },
  cover: { width: 48, height: 64, borderRadius: Spacing.one },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  pillPrimary: { backgroundColor: '#3c87f7', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  pillOutline: { borderWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
  pillText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
});
