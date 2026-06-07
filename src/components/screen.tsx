import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: ReactNode;
  /** 입력 폼이 있는 화면: 키보드가 입력창을 가리지 않도록 회피 + 자동 스크롤 */
  keyboardAvoiding?: boolean;
  /** 내용을 스크롤 가능하게 (keyboardAvoiding 이면 자동 활성) */
  scroll?: boolean;
  /** 내용 세로 가운데 정렬 */
  center?: boolean;
  /** 좌우/상하 기본 여백 */
  padded?: boolean;
  /** SafeArea 적용 가장자리 (기본: 전체). 헤더가 있는 화면은 react-navigation 이 top 을 자동 처리함 */
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
};

/**
 * 모든 화면의 표준 래퍼.
 * - SafeArea: 노치/상태바/홈 인디케이터 영역 침범 방지 ("세이프티 존")
 * - keyboardAvoiding: 입력 폼 화면에서 키보드가 입력창을 가리지 않도록 처리
 *
 * 사용 규칙은 CLAUDE.md "UI 규칙" 참조.
 */
export function Screen({
  children,
  keyboardAvoiding = false,
  scroll = false,
  center = false,
  padded = false,
  edges = ['top', 'bottom', 'left', 'right'],
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const useScroll = scroll || keyboardAvoiding;

  const containerStyle = [
    styles.grow,
    center && styles.center,
    padded && styles.padded,
    contentStyle,
  ];

  const body = useScroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={containerStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, ...containerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  center: { justifyContent: 'center' },
  padded: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
});
