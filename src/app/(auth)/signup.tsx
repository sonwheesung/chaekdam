import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { checkUsernameAvailable } from '@/api/profiles';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function SignUpScreen() {
  const theme = useTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  // 아이디를 수정하면 중복 확인 결과를 초기화 (재확인 강제)
  function onChangeUsername(value: string) {
    setUsername(value);
    setUsernameStatus('idle');
  }

  async function onCheckUsername() {
    const u = username.trim();
    if (!u) {
      Alert.alert('입력 확인', '아이디를 입력하세요.');
      return;
    }
    setUsernameStatus('checking');
    const { available, error } = await checkUsernameAvailable(u);
    if (error) {
      setUsernameStatus('idle');
      Alert.alert('오류', error);
      return;
    }
    setUsernameStatus(available ? 'available' : 'taken');
  }

  async function onSubmit() {
    if (!username.trim() || !displayName.trim() || !email.trim() || !password) {
      Alert.alert('입력 확인', '모든 항목을 입력하세요.');
      return;
    }
    if (usernameStatus !== 'available') {
      Alert.alert('아이디 확인', '아이디 중복 확인을 해주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 확인', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('입력 확인', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await signUp({
      email: email.trim(),
      password,
      username: username.trim(),
      displayName: displayName.trim(),
    });
    if (error) {
      setLoading(false);
      Alert.alert('회원가입 실패', error);
      return;
    }
    // 가입 직후 자동 로그인된 세션을 해제하고 로그인 화면으로 보낸다.
    await signOut();
    setLoading(false);
    Alert.alert('회원가입 완료', '로그인해 주세요.');
    router.replace('/login');
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <Screen keyboardAvoiding center padded contentStyle={styles.content}>
      <ThemedText type="subtitle">회원가입</ThemedText>

      {/* 아이디 + 중복 확인 버튼 (input 우측) */}
      <View>
        <View style={[styles.inputRow, { borderColor: theme.backgroundSelected }]}>
          <TextInput
            style={[styles.rowInput, { color: theme.text }]}
            placeholder="아이디 (영문/숫자)"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            value={username}
            onChangeText={onChangeUsername}
          />
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={onCheckUsername}
            disabled={usernameStatus === 'checking'}
          >
            <ThemedText style={styles.checkBtnText}>
              {usernameStatus === 'checking' ? '확인중…' : '확인'}
            </ThemedText>
          </TouchableOpacity>
        </View>
        {usernameStatus === 'available' && (
          <ThemedText type="small" style={[styles.hint, styles.ok]}>
            사용 가능한 아이디입니다.
          </ThemedText>
        )}
        {usernameStatus === 'taken' && (
          <ThemedText type="small" style={[styles.hint, styles.bad]}>
            이미 사용 중인 아이디입니다.
          </ThemedText>
        )}
      </View>

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
      <TextInput
        style={inputStyle}
        placeholder="비밀번호 확인"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  rowInput: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  checkBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  checkBtnText: { color: '#3c87f7', fontWeight: '600', fontSize: 14 },
  hint: { marginTop: Spacing.one, marginLeft: Spacing.one },
  ok: { color: '#2e9e44' },
  bad: { color: '#e5484d' },
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
