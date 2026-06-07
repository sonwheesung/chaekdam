# Dev Build 필요 작업 (OCR · 푸시 발송)

현재 앱은 **Expo Go(SDK 54)** 에서 인증·친구·책·독후감·댓글·좋아요·인앱 알림까지 모두 동작한다.
아래 두 가지는 네이티브 모듈/서버 배포가 필요해 **dev build** 단계에서 마무리한다.

## 1. OCR 문장 추출 (스펙 §C-7, §6-6)

현재 독후감 작성은 **인용 문장 수동 입력**으로 대체되어 있다(`src/app/review/new.tsx`).
온디바이스 OCR은 Expo Go에서 동작하지 않으므로 dev build에서 붙인다.

구현 순서:
1. dev build 준비: `npx expo install expo-dev-client`(설치됨) → `eas build --profile development`
2. OCR 모듈: `npx expo install @react-native-ml-kit/text-recognition` (config plugin → prebuild 필요)
3. 카메라: `npx expo install expo-camera` (이미 image-picker 있음 — 촬영은 camera 권장)
4. 플로우(스펙 §C-7):
   - 카메라/갤러리로 페이지 촬영 → `expo-image-manipulator`로 회전 보정·리사이즈(설치됨)
   - ML Kit `recognize()` → block/line/element + bounding box(frame) 반환
   - 사진 위에 line들을 반투명 박스로 오버레이, 드래그/탭으로 다중 선택(형광펜)
   - 선택 line들의 text를 순서대로 합쳐 `quoted_text` 후보로 → **편집 단계**(필수) → 저장
5. 원본 페이지 사진은 선택적으로 `page-photos` 버킷에 보관(비공개, 이미 정책 있음).

## 2. 푸시 알림 발송 (스펙 §E-11, §6-8)

인앱 알림 적재(트리거)·알림 설정(전체/야간/세분화)·발송 정책 순수 함수
(`src/domain/notifications.ts`)는 완료. **실제 Expo Push 발송**만 남았다.

구현 순서:
1. 푸시 토큰 등록(dev build 필요):
   - `npx expo install expo-notifications`
   - 로그인 후 `getExpoPushTokenAsync()` → `push_tokens` 테이블에 upsert
     (테이블/RLS 이미 있음: 본인 행만 쓰기)
   - 알림 권한 요청 처리(스펙 §10)
2. Edge Function 배포(작성 완료: `supabase/functions/send-push/index.ts`):
   - `supabase functions deploy send-push`
   - 시크릿: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. 트리거 연결: 대시보드 › Database › Webhooks → `notifications` INSERT →
   send-push 함수 URL 호출(헤더에 service_role). 함수가 설정/야간/토큰을 확인해 Expo Push 발송.
4. 타임존: 현재 함수는 KST(+9) 가정. 정확히 하려면 `profiles`에 사용자 timezone 컬럼 추가 후
   야간 판정에 사용(스펙 §5 주의사항).

## 참고
- 발송 정책(전체 off / 야간 구간 / 세분화)은 `src/domain/notifications.ts`의 `shouldSendPush`로
  테스트되어 있고, Edge Function에도 동일 규칙이 반영돼 있다.
