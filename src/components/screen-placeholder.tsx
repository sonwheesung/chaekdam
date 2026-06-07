import { StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** 아직 구현되지 않은 화면의 빈 상태 플레이스홀더. 후속 단계에서 실제 화면으로 교체. */
export function ScreenPlaceholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Screen center padded contentStyle={styles.content}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: Spacing.two },
  subtitle: { textAlign: 'center' },
});
