import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScreenPlaceholder
      title="책 상세"
      subtitle={`book id: ${id}\n책 정보 + 멤버 + 초대 + 독후감 피드가 여기에 들어갑니다.`}
    />
  );
}
