import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { createBook } from '@/api/books';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickImageFromLibrary, type PickedImage } from '@/lib/imagePicker';
import { uploadImageBase64 } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';

export default function NewBookScreen() {
  const theme = useTheme();
  const me = useAuthStore((s) => s.user?.id ?? '');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [cover, setCover] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);

  async function onPickCover() {
    const { image, error } = await pickImageFromLibrary();
    if (error) {
      Alert.alert('오류', error);
      return;
    }
    if (image) setCover(image);
  }

  async function onSave() {
    if (!title.trim()) {
      Alert.alert('입력 확인', '제목을 입력하세요.');
      return;
    }
    setSaving(true);
    let coverUrl: string | null = null;
    if (cover && me) {
      const up = await uploadImageBase64({ bucket: 'book-covers', base64: cover.base64, userId: me });
      if (up.error) {
        setSaving(false);
        Alert.alert('표지 업로드 실패', up.error);
        return;
      }
      coverUrl = up.url;
    }
    const { data, error } = await createBook({ title: title.trim(), author: author.trim() || null, coverUrl });
    setSaving(false);
    if (error || !data) {
      Alert.alert('등록 실패', error ?? '알 수 없는 오류');
      return;
    }
    router.replace(`/book/${data.id}`);
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <Screen keyboardAvoiding scroll padded contentStyle={styles.content}>
      <TouchableOpacity onPress={onPickCover} style={styles.coverPicker}>
        {cover ? (
          <Image source={{ uri: cover.uri }} style={styles.cover} />
        ) : (
          <ThemedView type="backgroundElement" style={[styles.cover, styles.coverEmpty]}>
            <ThemedText type="small" themeColor="textSecondary">
              표지 선택
            </ThemedText>
          </ThemedView>
        )}
      </TouchableOpacity>

      <TextInput
        style={inputStyle}
        placeholder="제목"
        placeholderTextColor={theme.textSecondary}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={inputStyle}
        placeholder="지은이 (선택)"
        placeholderTextColor={theme.textSecondary}
        value={author}
        onChangeText={setAuthor}
      />

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        <ThemedText style={styles.buttonText}>{saving ? '등록 중…' : '등록'}</ThemedText>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
  coverPicker: { alignSelf: 'center' },
  cover: { width: 120, height: 160, borderRadius: Spacing.two },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
