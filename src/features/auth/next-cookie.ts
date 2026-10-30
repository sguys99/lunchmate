// 로그인 후 돌아갈 경로를 OAuth 왕복 동안 담아 두는 쿠키 (T4.9).
// redirectTo 쿼리에 next를 실으면 Supabase Redirect URLs 허용 목록에 쿼리까지 맞춰야 하고(와일드카드 미사용 원칙),
// 경로가 제공자 로그에 남는다. 그래서 redirectTo는 쿼리 없는 /auth/callback으로 고정하고 next는 쿠키로 넘긴다.
// 값은 넣을 때와 꺼낼 때 모두 sanitizeNext로 검사한다.
export const NEXT_COOKIE = "lm_auth_next";

export function nextCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: 60 * 10,
  };
}
