import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScreenPlaceholder
      title="독후감 상세"
      subtitle={`review id: ${id}\n본문 + 인용 + 이미지 + 댓글 + 좋아요가 여기에 들어갑니다.`}
    />
  );
}
