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

/**
 * 약관 동의를 마쳤는가 (T10.3 후속, AUTH-02, AUTH-06). 약관 동의(terms_agreed_at)와 만 14세 확인(birth_confirmed_at)이
 * 둘 다 있어야 마친 것으로 본다. 동의 서버 액션은 두 열을 한 번에 쓰므로 한쪽만 있는 행은 비정상이고, 그때는 약관 화면을
 * 다시 보여 준다(다시 동의하면 비어 있는 쪽만 채워진다, DB 트리거는 이미 있는 시각을 바꾸지 않는다).
 * proxy가 가볍게 가져오도록 이 파일에 둔다(terms.ts가 다시 내보낸다). proxy, /auth/callback, 약관 화면, 온보딩 화면이 모두 이 함수로 판정해야 서로 다른 판정으로 오가는 고리가 생기지 않는다.
 */
export type ConsentRow = {
  terms_agreed_at: string | null;
  birth_confirmed_at: string | null;
};

export function hasCompletedConsent(
  profile: ConsentRow | null | undefined,
): boolean {
  return Boolean(profile?.terms_agreed_at && profile.birth_confirmed_at);
}
