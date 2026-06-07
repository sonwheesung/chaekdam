import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

export default function SignUpScreen() {
  const theme = useTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!username.trim() || !displayName.trim() || !email.trim() || !password) {
      Alert.alert('입력 확인', '모든 항목을 입력하세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 확인', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    const { error } = await signUp({
      email: email.trim(),
      password,
      username: username.trim(),
      displayName: displayName.trim(),
    });
    setLoading(false);
    if (error) {
      Alert.alert('회원가입 실패', error);
      return;
    }
    Alert.alert('회원가입 완료', '이메일 인증이 필요할 수 있습니다. 로그인해 주세요.');
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <Screen keyboardAvoiding center padded contentStyle={styles.content}>
      <ThemedText type="subtitle">회원가입</ThemedText>

      <TextInput
        style={inputStyle}
        placeholder="아이디 (영문/숫자)"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={inputStyle}
        placeholder="이름"
        placeholderTextColor={theme.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={inputStyle}
        placeholder="이메일"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        <ThemedText style={styles.buttonText}>{loading ? '가입 중…' : '회원가입'}</ThemedText>
      </TouchableOpacity>

      <Link href="/login" style={styles.link}>
        <ThemedText type="linkPrimary">이미 계정이 있으신가요? 로그인</ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
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
