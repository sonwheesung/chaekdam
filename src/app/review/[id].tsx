import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { deleteReview, fetchReview, type ReviewDetail } from '@/api/reviews';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuthStore((s) => s.user?.id ?? '');
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await fetchReview(id);
    setReview(data);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onDelete() {
    Alert.alert('독후감 삭제', '정말 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteReview(id);
          if (error) {
            Alert.alert('삭제 실패', error);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  if (loading && !review) {
    return (
      <Screen center>
        <ActivityIndicator size="large" />
      </Screen>
    );
  }
  if (!review) {
    return (
      <Screen center padded>
        <ThemedText>독후감을 찾을 수 없습니다.</ThemedText>
      </Screen>
    );
  }

  const location =
    review.page_number != null ? `p.${review.page_number}` : review.chapter ? review.chapter : null;

  return (
    <Screen scroll padded contentStyle={styles.content}>
      <View style={styles.head}>
        <ThemedText type="smallBold">{review.author?.display_name ?? '알 수 없음'}</ThemedText>
        {location ? (
          <ThemedText type="small" themeColor="textSecondary">
            {location}
          </ThemedText>
        ) : null}
      </View>

      {review.quoted_text ? (
        <ThemedView type="backgroundElement" style={styles.quoteBox}>
          <ThemedText style={styles.quote}>“{review.quoted_text}”</ThemedText>
        </ThemedView>
      ) : null}

      <ThemedText style={styles.body}>{review.content}</ThemedText>

      {review.images.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ))}

      {review.user_id === me && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <ThemedText style={styles.deleteText}>삭제</ThemedText>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteBox: { borderRadius: Spacing.two, padding: Spacing.three },
  quote: { fontStyle: 'italic', fontSize: 16, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 26 },
  image: { width: '100%', height: 240, borderRadius: Spacing.two },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#e5484d',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  deleteText: { color: '#e5484d', fontWeight: '600', fontSize: 16 },
});
