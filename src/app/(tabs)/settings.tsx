import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import {
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from '@/api/notificationSettings';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  const load = useCallback(async () => {
    const { data } = await fetchNotificationSettings();
    setSettings(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggle(key: keyof NotificationSettings, value: boolean) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    const { error } = await updateNotificationSettings({ [key]: value });
    if (error) {
      Alert.alert('설정 저장 실패', error);
      load();
    }
  }

  return (
    <Screen scroll padded contentStyle={styles.content}>
      <View style={styles.section}>
        <ThemedText type="smallBold">계정</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user?.email ?? '알 수 없음'}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">알림</ThemedText>
        {settings ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <Row
              label="전체 알림"
              value={settings.push_enabled}
              onChange={(v) => toggle('push_enabled', v)}
            />
            <Row
              label={`야간 알림 수신 (${settings.night_start.slice(0, 5)}~${settings.night_end.slice(0, 5)})`}
              value={settings.night_enabled}
              onChange={(v) => toggle('night_enabled', v)}
            />
            <Row
              label="댓글 알림"
              value={settings.comment_enabled}
              onChange={(v) => toggle('comment_enabled', v)}
            />
            <Row
              label="좋아요 알림"
              value={settings.like_enabled}
              onChange={(v) => toggle('like_enabled', v)}
            />
          </ThemedView>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            불러오는 중…
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          야간 알림을 끄면 야간 시간대에는 푸시가 발송되지 않습니다(알림은 앱 내에 저장).
        </ThemedText>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={() => signOut()}>
        <ThemedText style={styles.signOutText}>로그아웃</ThemedText>
      </TouchableOpacity>
    </Screen>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingBottom: Spacing.five },
  section: { gap: Spacing.two },
  card: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  rowLabel: { flex: 1, fontSize: 15 },
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
