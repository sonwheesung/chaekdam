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

서버/코드 측은 **모두 완료**. 남은 건 **dev build + EAS 프로젝트(푸시 자격증명)** 뿐이다.

이미 완료(코드/서버):
- ✅ 토큰 등록: 로그인 시 `registerForPushNotifications()` 호출(`src/lib/push.ts`, `app/_layout.tsx`),
  로그아웃 시 해제. 같은 기기 토큰을 현재 유저로 귀속하는 `register_push_token` RPC(migration 0007).
- ✅ Edge Function 배포됨: `supabase/functions/send-push`(설정/야간/세분화/토큰 확인 후 Expo Push).
- ✅ 웹훅 연결됨: `notifications` INSERT → pg_net 으로 함수 호출(migration 0006).
- ✅ 알림 설정/발송 정책 순수 함수 + 테스트(`src/domain/notifications.ts`).

남은 작업(네이티브):
1. **EAS 프로젝트 연결**: `eas init` → `app.json`에 `extra.eas.projectId` 생성
   (이게 있어야 `getExpoPushTokenAsync`가 토큰을 발급. 없으면 push.ts가 조용히 건너뜀).
2. **dev build 생성**: `eas build --profile development --platform android`
   - Android 푸시 자격증명(FCM v1)은 EAS가 빌드 시 자동 생성/관리(동의만 하면 됨).
   - iOS는 APNs 키(Apple 개발자 계정) 필요.
3. dev build 앱에서 로그인 → 권한 허용 → `push_tokens`에 실제 토큰 적재 →
   누군가 독후감/댓글/좋아요/초대 시 잠금화면 푸시 수신.
4. 타임존: 현재 함수는 KST(+9) 가정. 정확히 하려면 `profiles`에 timezone 컬럼 추가 후
   야간 판정에 사용(스펙 §5 주의).

> 검증: 토큰 등록/재귀속 RPC, Edge Function(토큰 없을 때 "no tokens"), 웹훅 트리거는
> 원격에서 확인됨. 실제 단말 푸시 수신만 dev build 에서 확인하면 끝.

## 참고
- 발송 정책(전체 off / 야간 구간 / 세분화)은 `src/domain/notifications.ts`의 `shouldSendPush`로
  테스트되어 있고, Edge Function에도 동일 규칙이 반영돼 있다.
