import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationMessage,
  type AppNotification,
} from '@/api/notifications';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function NotificationsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchNotifications();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onPressItem(n: AppNotification) {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      markNotificationRead(n.id);
    }
    if (n.payload.review_id) {
      router.push(`/review/${n.payload.review_id}`);
    } else if (n.payload.book_id) {
      router.push(`/book/${n.payload.book_id}`);
    }
  }

  async function onMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await markAllNotificationsRead();
  }

  const hasUnread = items.some((n) => !n.is_read);

  return (
    <Screen scroll padded contentStyle={styles.content}>
      {hasUnread && (
        <TouchableOpacity style={styles.markAll} onPress={onMarkAll}>
          <ThemedText type="small" style={styles.markAllText}>
            모두 읽음
          </ThemedText>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          알림이 없습니다.
        </ThemedText>
      ) : (
        items.map((n) => (
          <TouchableOpacity key={n.id} style={styles.row} onPress={() => onPressItem(n)}>
            {!n.is_read && <View style={styles.dot} />}
            <ThemedText
              type={n.is_read ? 'small' : 'smallBold'}
              themeColor={n.is_read ? 'textSecondary' : 'text'}
              style={styles.message}
            >
              {notificationMessage(n)}
            </ThemedText>
          </TouchableOpacity>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.one, paddingBottom: Spacing.five },
  markAll: { alignSelf: 'flex-end', paddingVertical: Spacing.one },
  markAllText: { color: '#3c87f7', fontWeight: '600' },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3c87f7' },
  message: { flex: 1 },
});
