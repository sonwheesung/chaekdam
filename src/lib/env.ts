/**
 * 환경 변수 접근 단일 지점.
 * EXPO_PUBLIC_ 접두사 변수는 Expo 빌드 시 정적으로 치환된다(process.env.EXPO_PUBLIC_*).
 * 값이 없으면 앱 시작 시 즉시 명확한 에러를 던져 디버깅을 쉽게 한다.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[env] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. ' +
      '.env.example 을 복사해 .env 를 만들고 값을 채운 뒤 dev 서버를 재시작하세요.',
  );
}

export const ENV = {
  supabaseUrl,
  supabaseAnonKey,
} as const;
