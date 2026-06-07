import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { createReview } from '@/api/reviews';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { pickImagesFromLibrary, type PickedImage } from '@/lib/imagePicker';
import { uploadImageBase64 } from '@/lib/storage';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';
import { useReviewDraft } from '@/stores/reviewDraftStore';

type LocationMode = 'page' | 'chapter';

export default function NewReviewScreen() {
  const theme = useTheme();
  const me = useAuthStore((s) => s.user?.id ?? '');
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const [quote, setQuote] = useState('');
  const [mode, setMode] = useState<LocationMode>('page');
  const [page, setPage] = useState('');
  const [chapter, setChapter] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  // OCR 화면에서 추출한 문장을 인용란에 반영
  const draftQuote = useReviewDraft((s) => s.quote);
  const setDraftQuote = useReviewDraft((s) => s.setQuote);
  useFocusEffect(
    useCallback(() => {
      if (draftQuote) {
        setQuote((prev) => (prev ? `${prev} ${draftQuote}` : draftQuote));
        setDraftQuote(null);
      }
    }, [draftQuote, setDraftQuote]),
  );

  async function onAddImages() {
    const { images: picked, error } = await pickImagesFromLibrary(5 - images.length);
    if (error) {
      Alert.alert('오류', error);
      return;
    }
    if (picked.length) setImages((prev) => [...prev, ...picked].slice(0, 5));
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((i) => i.uri !== uri));
  }

  async function onSave() {
    if (!bookId) {
      Alert.alert('오류', '책 정보가 없습니다.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('입력 확인', '독후감 본문을 입력하세요.');
      return;
    }
    setSaving(true);

    // 이미지 업로드
    const urls: string[] = [];
    for (const img of images) {
      const up = await uploadImageBase64({ bucket: 'review-images', base64: img.base64, userId: me });
      if (up.error || !up.url) {
        setSaving(false);
        Alert.alert('이미지 업로드 실패', up.error ?? '알 수 없는 오류');
        return;
      }
      urls.push(up.url);
    }

    const { error } = await createReview({
      bookId,
      quotedText: quote.trim() || null,
      pageNumber: mode === 'page' && page.trim() ? Number(page) : null,
      chapter: mode === 'chapter' && chapter.trim() ? chapter.trim() : null,
      content: content.trim(),
      imageUrls: urls,
    });
    setSaving(false);
    if (error) {
      Alert.alert('작성 실패', error);
      return;
    }
    router.back();
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <Screen keyboardAvoiding scroll padded contentStyle={styles.content}>
      <View style={styles.quoteHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          인용 문장 (선택)
        </ThemedText>
        <TouchableOpacity onPress={() => router.push('/review/ocr')}>
          <ThemedText type="small" style={styles.ocrLink}>
            📷 사진에서 문장 추출
          </ThemedText>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[inputStyle, styles.multiline]}
        placeholder="마음에 든 문장을 입력하세요 (사진에서 추출 후 편집 가능)"
        placeholderTextColor={theme.textSecondary}
        multiline
        value={quote}
        onChangeText={setQuote}
      />

      {/* 페이지 / 단원 택1 */}
      <View style={[styles.segmented, { borderColor: theme.backgroundSelected }]}>
        {(['page', 'chapter'] as LocationMode[]).map((m) => {
          const active = m === mode;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setMode(m)}
            >
              <ThemedText style={[styles.segmentText, active ? styles.segmentTextActive : { color: theme.textSecondary }]}>
                {m === 'page' ? '페이지' : '단원/챕터'}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
      {mode === 'page' ? (
        <TextInput
          style={inputStyle}
          placeholder="페이지 번호"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          value={page}
          onChangeText={setPage}
        />
      ) : (
        <TextInput
          style={inputStyle}
          placeholder="단원 또는 챕터"
          placeholderTextColor={theme.textSecondary}
          value={chapter}
          onChangeText={setChapter}
        />
      )}

      <ThemedText type="smallBold" themeColor="textSecondary">
        독후감
      </ThemedText>
      <TextInput
        style={[inputStyle, styles.multilineLarge]}
        placeholder="이 책/문장에 대한 생각을 적어보세요"
        placeholderTextColor={theme.textSecondary}
        multiline
        value={content}
        onChangeText={setContent}
      />

      {/* 이미지 첨부 */}
      <View style={styles.imagesRow}>
        {images.map((img) => (
          <TouchableOpacity key={img.uri} onPress={() => removeImage(img.uri)}>
            <Image source={{ uri: img.uri }} style={styles.thumb} />
            <ThemedView type="backgroundSelected" style={styles.removeBadge}>
              <ThemedText type="small">✕</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        ))}
        {images.length < 5 && (
          <TouchableOpacity onPress={onAddImages}>
            <ThemedView type="backgroundElement" style={[styles.thumb, styles.thumbAdd]}>
              <ThemedText type="small" themeColor="textSecondary">
                + 사진
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        <ThemedText style={styles.buttonText}>{saving ? '저장 중…' : '독후감 등록'}</ThemedText>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.two, paddingBottom: Spacing.five },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ocrLink: { color: '#3c87f7', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  multilineLarge: { minHeight: 140, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: Spacing.two, padding: 2, gap: 2, marginTop: Spacing.two },
  segment: { flex: 1, paddingVertical: Spacing.two, alignItems: 'center', borderRadius: Spacing.one },
  segmentActive: { backgroundColor: '#3c87f7' },
  segmentText: { fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#ffffff' },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  thumb: { width: 72, height: 72, borderRadius: Spacing.two },
  thumbAdd: { alignItems: 'center', justifyContent: 'center' },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
