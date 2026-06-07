import { supabase } from '@/lib/supabase';

/**
 * 아이디(username) 사용 가능 여부 확인.
 * 비로그인(회원가입) 단계에서도 호출 가능하도록 SECURITY DEFINER RPC(`username_available`)를 사용한다.
 * @returns available=true 면 사용 가능. error 가 있으면 available=null.
 */
export async function checkUsernameAvailable(
  username: string,
): Promise<{ available: boolean | null; error: string | null }> {
  const { data, error } = await supabase.rpc('username_available', { p_username: username });
  if (error) {
    return { available: null, error: error.message };
  }
  return { available: Boolean(data), error: null };
}
