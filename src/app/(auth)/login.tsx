import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const theme = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!username.trim() || !password) {
      Alert.alert('입력 확인', '아이디와 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(username.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('로그인 실패', error);
    }
    // 성공 시 onAuthStateChange → 세션 갱신 → 루트 게이트가 자동으로 (tabs)로 전환
  }

  return (
    <Screen keyboardAvoiding center padded contentStyle={styles.content}>
      <ThemedText type="subtitle">책담</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
        함께 읽고, 밑줄 긋고, 나누다
      </ThemedText>

      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        placeholder="아이디"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoComplete="username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        placeholder="비밀번호"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        <ThemedText style={styles.buttonText}>{loading ? '로그인 중…' : '로그인'}</ThemedText>
      </TouchableOpacity>

      <Link href="/signup" style={styles.link}>
        <ThemedText type="linkPrimary">계정이 없으신가요? 회원가입</ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
  tagline: { marginBottom: Spacing.three },
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
  link: { alignSelf: 'center', marginTop: Spacing.two },
});
