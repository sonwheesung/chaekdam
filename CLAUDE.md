# 책담(冊談) — 프로젝트 가이드 (CLAUDE.md)

@AGENTS.md

친구와 함께 책을 등록하고, 페이지를 촬영해 문장을 OCR로 추출하여 독후감을 쓰고, 댓글·좋아요로
소통하는 소셜 독서 앱. 상세 스펙은 `책담_SPEC.md` 참조.

## 기술 스택
- React Native + Expo (**SDK 54**) / TypeScript
  - 현재 단계(인증~독후감 텍스트)는 **Expo Go(54)**로 개발 가능.
  - **OCR 단계(스펙 §6-6, ML Kit)부터는 dev build 필수** — 그때 `eas build --profile development`.
- Expo Router(파일 기반 라우팅, typed routes), Zustand(상태)
- Supabase(PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- 테스트: Jest (jest-expo preset)

## 자주 쓰는 명령
```bash
npm start            # Expo dev 서버 (dev build 클라이언트 필요)
npm run android      # Android dev build 실행
npm run ios          # iOS dev build 실행 (macOS)
npm test             # Jest (도메인 순수 함수)
npm run typecheck    # tsc --noEmit
npx supabase db push                                   # 마이그레이션 적용
npx supabase gen types typescript --linked > src/types/database.ts  # 타입 재생성
```
> 실행 전 `.env` 필요(`.env.example` 복사). 없으면 `src/lib/env.ts`가 명확한 에러를 던짐.

## 디렉터리 / 레이어
- `src/app/` — Expo Router 라우트. `(auth)`(로그인/회원가입), `(tabs)`(책장/알림/친구/설정),
  `book/[id]`, `review/new`, `review/[id]`. 루트 `_layout.tsx`가 세션 기반 auth 게이트(`Stack.Protected`).
- `src/domain/` — **순수 비즈니스 로직 + 테스트**. 부수효과/네트워크 없음. (예: `notifications.ts` 야간 알림 판정,
  `friendship.ts` 친구/초대 정책). 새 정책 로직은 여기에 두고 테스트할 것.
- `src/lib/` — `supabase.ts`(단일 클라이언트), `env.ts`(환경변수 단일 진입).
- `src/stores/` — Zustand 스토어 (`authStore.ts`).
- `src/api/` — 도메인별 Supabase 쿼리 훅 (이후 단계에서 추가).
- `src/types/database.ts` — **자동 생성물**. 손으로 수정하지 말고 `gen types`로 재생성.
- `src/components/` — 공용 UI. `themed-text`/`themed-view`/`useTheme`로 라이트·다크 대응.
- `supabase/migrations/` — `<timestamp>_name.sql`. 0001 스키마+트리거, 0002 RLS, 0003 Storage.

## DB / RLS 핵심 규칙
- 모든 테이블 RLS 활성화. 기본 원칙: "내가 멤버인 책의 데이터만 접근", 작성물 수정/삭제는 본인만.
- **RLS에서 `book_members`를 직접 참조하면 무한 재귀** → `is_book_member`/`is_book_owner`/
  `are_friends`/`can_access_review` 같은 SECURITY DEFINER 헬퍼로 감싸 사용(`0002_rls.sql`).
- 멤버 합류는 `accept_book_invitation(uuid)` RPC로 원자 처리. owner는 `books` insert 트리거로 자동 등록.
- 신규 가입 시 `handle_new_user` 트리거가 `profiles` + `notification_settings` 생성
  (username/display_name은 signUp의 user_metadata에서). 알림 발송 보류 로직은 `src/domain/notifications.ts` 재사용.

## 컨벤션
- import 경로는 `@/*` (→ `src/*`).
- 비즈니스/정책 로직은 컴포넌트가 아니라 `src/domain/`의 순수 함수로 분리하고 테스트 작성.
- 비밀값은 `.env`에만(커밋 금지). `EXPO_PUBLIC_*`만 클라이언트 번들에 노출.

## UI 규칙 (필수)
- **모든 화면은 `src/components/screen.tsx`의 `Screen` 컴포넌트로 감싼다.** 화면 루트에서 `ThemedView`/
  `SafeAreaView`/`ScrollView`를 직접 쓰지 말 것 — `Screen`이 표준 처리를 담당한다.
- **세이프티 존(SafeArea)**: `Screen`이 노치/상태바/홈 인디케이터 영역 침범을 자동 방지. 헤더가 있는
  화면은 react-navigation이 top inset을 처리하므로 중복 패딩 걱정 없음.
- **키보드 가림 방지**: 입력창(`TextInput`)이 있는 화면은 `<Screen keyboardAvoiding>` 사용
  → 키보드가 입력창을 가리지 않게 회피 + 자동 스크롤(`keyboardShouldPersistTaps="handled"`).
- 옵션: `center`(세로 가운데), `padded`(기본 여백), `scroll`(스크롤), `edges`(SafeArea 가장자리),
  `contentStyle`(예: `{ gap }`). 예) 폼 화면 `<Screen keyboardAvoiding center padded>`.

## 진행 상황 / 다음 단계 (스펙 §6 순서)
- [x] 1. 스키마/RLS/Storage 마이그레이션 + 타입 생성
- [x] 2. Expo 스캐폴드 + Auth(이메일/비번, 아이디 중복확인)
- [x] 3. 친구(검색·요청·수락, 토글 화면)
- [x] 4. 책 등록(표지 업로드)/친구 초대/수락/책장/책 상세
- [x] 5. 독후감 폼(인용·페이지/단원·본문·이미지)+피드+상세
- [~] 6. OCR 카메라 플로우 — **수동 인용 입력으로 대체**, OCR은 dev build 필요 → `DEV_BUILD.md`
- [x] 7. 댓글·좋아요
- [~] 8. 알림 — 인앱 적재 트리거 + 설정(전체/야간/세분화) 완료, **푸시 발송은 dev build+Edge Function 배포 필요** → `DEV_BUILD.md`
- [x] 9. 인앱 알림 화면 + 읽음 처리
- [x] 10. 빈 상태/로딩/권한(이미지) 처리

남은 네이티브 작업(OCR, 푸시 발송)은 `DEV_BUILD.md` 참조. 푸시 Edge Function 코드는
`supabase/functions/send-push/index.ts`에 배포 준비 완료.
