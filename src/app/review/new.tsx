import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function NewReviewScreen() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  return (
    <ScreenPlaceholder
      title="독후감 작성"
      subtitle={`book id: ${bookId ?? '미지정'}\n카메라 → OCR/문장 선택 → 작성 폼이 여기에 들어갑니다.`}
    />
  );
}
