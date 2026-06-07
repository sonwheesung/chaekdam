import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { pickImageForOcr, type PickedImage } from '@/lib/imagePicker';
import { combineSelectedLines, recognizeKoreanLines, type OcrLine } from '@/lib/ocr';
import { useReviewDraft } from '@/stores/reviewDraftStore';
import { useTheme } from '@/hooks/use-theme';

export default function OcrScreen() {
  const theme = useTheme();
  const setQuote = useReviewDraft((s) => s.setQuote);

  const [image, setImage] = useState<PickedImage | null>(null);
  const [lines, setLines] = useState<OcrLine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [containerW, setContainerW] = useState(0);

  async function choose(source: 'library' | 'camera') {
    const { image: img, error } = await pickImageForOcr(source);
    if (error || !img) {
      if (error) alertError(error);
      return;
    }
    setImage(img);
    setLines([]);
    setSelected(new Set());
    setBusy(true);
    const { lines: recognized, error: ocrErr } = await recognizeKoreanLines(img.uri);
    setBusy(false);
    if (ocrErr) {
      alertError(`인식 실패: ${ocrErr}`);
      return;
    }
    setLines(recognized);
    if (recognized.length === 0) alertError('인식된 텍스트가 없습니다. 더 선명한 사진으로 시도해 보세요.');
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onExtract() {
    const text = combineSelectedLines(lines, selected);
    if (!text) {
      alertError('색칠한 문장이 없습니다.');
      return;
    }
    setQuote(text);
    router.back();
  }

  // 이미지 표시 스케일 계산
  const scale = image && image.width > 0 && containerW > 0 ? containerW / image.width : 0;
  const displayH = image && scale > 0 ? image.height * scale : 0;

  return (
    <Screen scroll padded contentStyle={styles.content}>
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickBtn} onPress={() => choose('camera')}>
          <ThemedText style={styles.pickBtnText}>📷 촬영</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={() => choose('library')}>
          <ThemedText style={styles.pickBtnText}>🖼 갤러리</ThemedText>
        </TouchableOpacity>
      </View>

      {!image ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          책 페이지를 촬영하거나 갤러리에서 선택하면 글자를 인식해요. 원하는 문장을 탭해서 색칠한 뒤 "문장 추출"을 누르세요.
        </ThemedText>
      ) : (
        <View
          style={styles.imageWrap}
          onLayout={(e: LayoutChangeEvent) => setContainerW(e.nativeEvent.layout.width)}
        >
          {scale > 0 && (
            <View style={{ width: containerW, height: displayH }}>
              <Image source={{ uri: image.uri }} style={{ width: containerW, height: displayH }} />
              {lines.map((l) => {
                const isSel = selected.has(l.id);
                return (
                  <TouchableWithoutFeedback key={l.id} onPress={() => toggle(l.id)}>
                    <View
                      style={[
                        styles.lineBox,
                        {
                          left: l.left * scale,
                          top: l.top * scale,
                          width: l.width * scale,
                          height: l.height * scale,
                          backgroundColor: isSel ? 'rgba(255,221,0,0.45)' : 'rgba(60,135,247,0.12)',
                          borderColor: isSel ? '#f5a623' : 'rgba(60,135,247,0.4)',
                        },
                      ]}
                    />
                  </TouchableWithoutFeedback>
                );
              })}
            </View>
          )}
          {busy && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator size="large" color="#ffffff" />
              <ThemedText style={styles.busyText}>글자 인식 중…</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* 선택 미리보기 */}
      {selected.size > 0 && (
        <ThemedView type="backgroundElement" style={styles.preview}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            선택한 문장
          </ThemedText>
          <ThemedText style={styles.previewText}>{combineSelectedLines(lines, selected)}</ThemedText>
        </ThemedView>
      )}

      {image && lines.length > 0 && (
        <TouchableOpacity
          style={[styles.extractBtn, selected.size === 0 && styles.extractBtnDisabled]}
          onPress={onExtract}
          disabled={selected.size === 0}
        >
          <ThemedText style={styles.extractText}>문장 추출 ({selected.size})</ThemedText>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

function alertError(msg: string) {
  Alert.alert('알림', msg);
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.five },
  pickRow: { flexDirection: 'row', gap: Spacing.two },
  pickBtn: {
    flex: 1,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  pickBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  hint: { paddingVertical: Spacing.four, textAlign: 'center', lineHeight: 22 },
  imageWrap: { width: '100%' },
  lineBox: { position: 'absolute', borderWidth: 1, borderRadius: 2 },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  busyText: { color: '#ffffff' },
  preview: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  previewText: { fontSize: 15, lineHeight: 22 },
  extractBtn: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  extractBtnDisabled: { backgroundColor: '#8b8d98', opacity: 0.6 },
  extractText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
