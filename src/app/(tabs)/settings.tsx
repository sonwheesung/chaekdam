import { StyleSheet, TouchableOpacity } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Screen padded contentStyle={styles.content}>
      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">계정</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user?.email ?? '알 수 없음'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="smallBold">알림</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          전체 알림 / 야간 알림 설정은 다음 단계에서 구현됩니다.
        </ThemedText>
      </ThemedView>

      <TouchableOpacity style={styles.signOut} onPress={() => signOut()}>
        <ThemedText style={styles.signOutText}>로그아웃</ThemedText>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four },
  section: { gap: Spacing.one },
  signOut: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#e5484d',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  signOutText: { color: '#e5484d', fontWeight: '600', fontSize: 16 },
});
