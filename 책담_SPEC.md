# 책담(冊談) — 독후감 공유 앱 개발 스펙

> 친구와 함께 책을 등록하고, 페이지를 촬영해 마음에 드는 문장을 추출하여 독후감을 쓰고, 서로 댓글·좋아요로 소통하는 소셜 독서 앱.

---

## 1. 기술 스택

- **Frontend**: React Native + Expo (dev build — Expo Go 아님)
- **언어**: TypeScript
- **상태관리**: Zustand
- **네비게이션**: React Navigation (or Expo Router)
- **백엔드 / DB / Auth / Storage**: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **푸시 알림**: Expo Notifications + Supabase Edge Function
- **OCR(문장 추출)**: 온디바이스 ML Kit Text Recognition (`@react-native-ml-kit/text-recognition`, config plugin 필요 → dev build) / 대안으로 Google Cloud Vision API
- **이미지 처리**: expo-image-picker, expo-camera, expo-image-manipulator

> OCR은 Expo Go에서 안 돌아가므로 처음부터 `expo prebuild` 기반 dev build로 진행할 것.

---

## 2. 핵심 기능 명세

### A. 인증 / 친구
1. Supabase Auth(이메일 or 소셜)로 회원가입·로그인.
2. 사용자 검색(닉네임/아이디)으로 **친구 요청 → 수락/거절** 플로우.
3. 초대는 **친구로 등록된 사람만** 가능. (친구 아닌 사용자는 초대 UI에 노출되지 않음)

### B. 책 등록 / 공유
4. 책 등록 항목: **제목, 지은이, 표지 이미지(첨부)**. 표지는 Storage 업로드.
5. 책 등록자가 친구를 해당 책에 **초대** → 초대받은 사람이 **수락하면 멤버로 합류**.
6. 같은 책의 멤버끼리 독후감을 공유해서 봄.

### C. 독후감 작성 (핵심)
7. 작성 플로우:
   - (1) 카메라로 **해당 페이지 촬영** 또는 갤러리에서 선택
   - (2) 촬영 이미지에 OCR 실행 → 인식된 텍스트 블록을 **bounding box로 오버레이**
   - (3) 사용자가 원하는 문장 영역을 **색칠/드래그 선택(형광펜)** → 해당 영역 텍스트만 추출
   - (4) 추출된 문장을 인용구로 저장
8. 독후감 작성 항목:
   - **인용 문장(추출 텍스트, 수동 편집 가능)**
   - **페이지 번호 또는 단원/챕터**
   - **독후감 본문**
   - **이미지 첨부(여러 장 가능)**

### D. 소셜
9. 다른 멤버가 독후감에 **댓글** 작성 가능.
10. **좋아요** 토글 (사용자당 1회, 좋아요 수 표시).

### E. 알림
11. 독후감이 새로 작성되면 **해당 책을 공유 중인 다른 멤버 전원에게 푸시 알림**.
12. 알림 설정:
    - 전체 알림 **on/off**
    - **야간 알림 수신 여부** (off면 지정 시간대(예: 22:00~08:00) 동안 푸시 미발송, 또는 다음날 모아보기)
    - (선택) 새 댓글·좋아요 알림 on/off 세분화

---

## 3. 데이터 모델 (Supabase / PostgreSQL)

> 모든 테이블에 **RLS 활성화**. 기본 원칙: "내가 멤버인 책의 데이터만 읽기/쓰기 가능".

```
profiles            -- auth.users 1:1 확장
  id (uuid, PK, = auth.uid)
  username (unique)
  display_name
  avatar_url
  created_at

friendships
  id (uuid, PK)
  requester_id (uuid, FK profiles)
  addressee_id (uuid, FK profiles)
  status        -- 'pending' | 'accepted' | 'blocked'
  created_at
  -- unique(requester_id, addressee_id), 양방향 조회 주의

books
  id (uuid, PK)
  title
  author
  cover_url
  created_by (uuid, FK profiles)
  created_at

book_members          -- 책을 공유 중인 사람
  id (uuid, PK)
  book_id (uuid, FK books)
  user_id (uuid, FK profiles)
  role        -- 'owner' | 'member'
  joined_at
  -- unique(book_id, user_id)

book_invitations
  id (uuid, PK)
  book_id (uuid, FK books)
  inviter_id (uuid, FK profiles)
  invitee_id (uuid, FK profiles)
  status      -- 'pending' | 'accepted' | 'declined'
  created_at

reviews
  id (uuid, PK)
  book_id (uuid, FK books)
  user_id (uuid, FK profiles)
  quoted_text       -- OCR로 추출/편집한 인용 문장
  page_number (int, nullable)
  chapter (text, nullable)   -- 페이지 또는 단원 중 택1 입력
  content           -- 독후감 본문
  created_at
  updated_at

review_images
  id (uuid, PK)
  review_id (uuid, FK reviews)
  image_url
  sort_order (int)

comments
  id (uuid, PK)
  review_id (uuid, FK reviews)
  user_id (uuid, FK profiles)
  content
  created_at

likes
  id (uuid, PK)
  review_id (uuid, FK reviews)
  user_id (uuid, FK profiles)
  created_at
  -- unique(review_id, user_id)

notifications
  id (uuid, PK)
  user_id (uuid, FK profiles)   -- 받는 사람
  type        -- 'new_review' | 'new_comment' | 'new_like' | 'invitation'
  payload (jsonb)               -- { book_id, review_id, actor_id ... }
  is_read (bool, default false)
  created_at

notification_settings
  user_id (uuid, PK, FK profiles)
  push_enabled (bool, default true)
  night_enabled (bool, default false)   -- 야간 알림 수신 여부
  night_start (time, default '22:00')
  night_end (time, default '08:00')
  comment_enabled (bool, default true)
  like_enabled (bool, default true)

push_tokens
  id (uuid, PK)
  user_id (uuid, FK profiles)
  expo_push_token
  platform     -- 'ios' | 'android'
  updated_at
```

### Storage 버킷
- `avatars` — 프로필 이미지
- `book-covers` — 책 표지
- `review-images` — 독후감 첨부 이미지
- `page-photos` — OCR용 페이지 원본(선택적으로 보관)

---

## 4. 화면 구성 (네비게이션)

- **Auth**: 로그인 / 회원가입
- **메인 탭**
  - 책장(My Books): 내가 멤버인 책 목록 → 책 상세
  - 알림(Notifications): 알림 리스트, 읽음 처리
  - 친구(Friends): 친구 목록 / 요청 관리 / 사용자 검색
  - 설정(Settings): 알림 on/off, 야간 알림, 프로필
- **책 상세**: 책 정보 + 멤버 목록 + 멤버 초대(친구만) + 독후감 피드
- **독후감 작성 플로우**: 카메라 → OCR/문장 선택 → 작성 폼(인용/페이지·단원/본문/이미지)
- **독후감 상세**: 본문 + 인용 + 이미지 + 댓글 + 좋아요

---

## 5. 기술적 고려사항

### OCR 문장 추출
- ML Kit Text Recognition은 인식 결과를 **block → line → element** 단위로 bounding box(frame)와 함께 반환.
- 화면에 사진을 띄우고 인식된 line/element를 반투명 박스로 오버레이.
- 사용자가 드래그하거나 탭으로 line들을 "형광펜 칠"하듯 다중 선택 → 선택된 line들의 text를 순서대로 합쳐 `quoted_text`로 사용.
- 이미지 리사이즈/회전 보정 후 OCR에 넘길 것(expo-image-manipulator).
- 추출 후 사용자가 텍스트를 직접 수정할 수 있는 편집 단계 필수(OCR 오인식 대비).

### 푸시 알림 (독후감 작성 시)
- `reviews` INSERT를 트리거로 Supabase **Edge Function** 호출(DB trigger → http, 또는 클라이언트에서 작성 성공 후 함수 호출).
- 함수 로직:
  1. 해당 `book_id`의 `book_members` 조회(작성자 제외).
  2. 각 멤버의 `notification_settings` 확인 → `push_enabled=false`면 스킵.
  3. `night_enabled=false`이고 현재 시각이 야간 구간이면 푸시 스킵(알림은 DB에 저장하되 발송만 보류).
  4. `push_tokens`로 Expo Push API 호출.
  5. `notifications` 테이블에 레코드 적재(인앱 알림용).
- 타임존 처리 주의(사용자/서버 TZ 일관성).

### RLS 정책 핵심
- `reviews`, `comments`, `likes`: 해당 `book_id`의 `book_members`에 내가 있을 때만 select/insert.
- `comments`/`likes`/`reviews`의 update·delete는 작성자 본인만.
- `book_invitations`: 초대 대상(invitee)만 수락/거절 가능, 초대자는 친구 관계일 때만 생성 가능(친구 검증은 함수 또는 정책에서).

---

## 6. 권장 개발 순서

1. Supabase 프로젝트 + 테이블/RLS + Storage 버킷 세팅, 타입 생성(`supabase gen types`).
2. Expo dev build 셋업 + Auth(로그인/회원가입/프로필).
3. 친구 기능(검색·요청·수락).
4. 책 등록(표지 업로드) + 멤버 초대/수락 + 책장·책 상세.
5. 독후감 작성 폼(텍스트만, 이미지 첨부) + 피드.
6. OCR 카메라 플로우(문장 선택·추출) 붙이기.
7. 댓글·좋아요 + Realtime 반영.
8. 푸시 알림(Edge Function) + 알림 설정(on/off·야간).
9. 인앱 알림 화면 + 읽음 처리.
10. 마감: 에러 핸들링, 빈 상태 UI, 권한(카메라/알림) 처리.

---

## 7. 작업 지시 (Claude Code용)

위 스펙대로 React Native + Expo + TypeScript + Supabase 앱을 구현해줘.

- 비즈니스 로직(시뮬레이션/계산성 로직, 정책 검증 등)은 순수 함수로 분리해 테스트 가능하게.
- Supabase 클라이언트, 쿼리 훅, 컴포넌트를 명확히 레이어 분리.
- 먼저 **프로젝트 구조 + DB 마이그레이션 SQL(테이블/RLS) + 타입 정의**부터 제안하고, 내 확인 후 단계별로 구현해줘.
- 한 번에 다 만들지 말고 위 "권장 개발 순서" 단위로 끊어서 진행.
