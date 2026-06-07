import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { deleteReview, fetchReview, type ReviewDetail } from '@/api/reviews';
import {
  addComment,
  deleteComment,
  fetchComments,
  fetchLikeStatus,
  toggleLike,
  type Comment,
} from '@/api/social';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const me = useAuthStore((s) => s.user?.id ?? '');

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [r, like, cm] = await Promise.all([
      fetchReview(id),
      fetchLikeStatus(id),
      fetchComments(id),
    ]);
    setReview(r.data);
    setLiked(like.liked);
    setLikeCount(like.count);
    setComments(cm.data);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onToggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const { error } = await toggleLike(id, !next);
    if (error) {
      // 롤백
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      Alert.alert('오류', error);
    }
  }

  async function onAddComment() {
    const text = commentText.trim();
    if (!text) return;
    setPosting(true);
    const { error } = await addComment(id, text);
    setPosting(false);
    if (error) {
      Alert.alert('댓글 등록 실패', error);
      return;
    }
    setCommentText('');
    const cm = await fetchComments(id);
    setComments(cm.data);
  }

  async function onDeleteComment(commentId: string) {
    const { error } = await deleteComment(commentId);
    if (error) {
      Alert.alert('삭제 실패', error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function onDeleteReview() {
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
    <Screen keyboardAvoiding scroll padded contentStyle={styles.content}>
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

      {/* 좋아요 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.likeBtn} onPress={onToggleLike}>
          <ThemedText style={[styles.likeIcon, liked && styles.likeIconActive]}>
            {liked ? '♥' : '♡'}
          </ThemedText>
          <ThemedText type="smallBold">{likeCount}</ThemedText>
        </TouchableOpacity>
        {review.user_id === me && (
          <TouchableOpacity onPress={onDeleteReview}>
            <ThemedText type="small" style={styles.deleteText}>
              삭제
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* 댓글 */}
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          댓글 ({comments.length})
        </ThemedText>
        {comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <View style={styles.commentText}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {c.author?.display_name ?? '알 수 없음'}
              </ThemedText>
              <ThemedText type="small">{c.content}</ThemedText>
            </View>
            {c.user_id === me && (
              <TouchableOpacity onPress={() => onDeleteComment(c.id)}>
                <ThemedText type="small" themeColor="textSecondary">
                  삭제
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {comments.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            첫 댓글을 남겨보세요.
          </ThemedText>
        )}
      </View>

      {/* 댓글 입력 */}
      <View style={[styles.commentInputRow, { borderColor: theme.backgroundSelected }]}>
        <TextInput
          style={[styles.commentInput, { color: theme.text }]}
          placeholder="댓글 달기"
          placeholderTextColor={theme.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={onAddComment}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={onAddComment} disabled={posting} style={styles.commentSend}>
          <ThemedText style={styles.commentSendText}>{posting ? '…' : '등록'}</ThemedText>
        </TouchableOpacity>
      </View>
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
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  likeIcon: { fontSize: 22, color: '#8b8d98' },
  likeIconActive: { color: '#e5484d' },
  deleteText: { color: '#e5484d' },
  section: { gap: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { paddingVertical: Spacing.two },
  comment: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', paddingVertical: Spacing.one },
  commentText: { flex: 1, gap: 2 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  commentInput: { flex: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 15 },
  commentSend: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  commentSendText: { color: '#3c87f7', fontWeight: '600' },
});
