// 약관 동의 확인 쿠키 (T4.11). proxy가 로그인 사용자의 앱 경로마다 DB를 부르지 않게, 동의를 한 번 확인하면
// 사용자 id를 HttpOnly 쿠키에 적어 둔다. 값이 지금 세션의 sub와 같을 때만 믿는다(다른 계정으로 바꿔 로그인하면 다시 확인).
// 쿠키를 위조해도 자기 계정의 약관 화면을 건너뛸 뿐이고 DB의 terms_agreed_at은 그대로 null이다.
// 쓰기 기능(투표 만들기, 후기 등)이 동의를 꼭 요구해야 하면 그 서버 함수에서 terms_agreed_at을 다시 본다.
export const TERMS_COOKIE = "lm_terms";

export function termsCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

/** 쿠키가 이 사용자의 동의 기록인가 */
export function termsCookieMatches(
  value: string | undefined | null,
  userId: string,
): boolean {
  return typeof value === "string" && value.length > 0 && value === userId;
}
