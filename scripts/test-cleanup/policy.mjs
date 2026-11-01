// 테스트 계정 판정 규칙 (T8.18, CLAUDE.md 7.1). 순수 함수, 네트워크 없음. 테스트: policy.test.ts
//
// 실제 사용자를 지우지 않도록 세 겹으로 확인한다. 셋 다 맞아야 삭제 대상이다.
// 1. 닉네임: profiles.nickname이 test_로 시작한다(프로필 행이 없거나 닉네임이 비면 가입 메타데이터 nickname으로 본다).
// 2. 생성 경로 표식(이메일): RLS 하네스(src/lib/supabase/rls/harness.ts)와 E2E 세션 헬퍼만 쓰는
//    test_rls_ 접두 + 테스트 이메일 도메인(RLS_TEST_EMAIL_DOMAIN, 기본 example.com). 실제 사용자는 카카오, 네이버, 구글
//    로그인이라 이메일을 받지 않는다(AUTH-01, T0.20).
// 3. 생성 경로 표식(provider): Auth Admin API로 만든 email provider 계정이고 다른 provider가 붙어 있지 않다.
// 셋 가운데 일부만 맞으면 "확인 필요"로 목록에만 보이고 지우지 않는다.

export const NICKNAME_PREFIX = "test_";
export const EMAIL_PREFIX = "test_rls_";
export const POLL_TITLE_PREFIX = "test_";

/**
 * @typedef {{
 *   id: string,
 *   email?: string | null,
 *   app_metadata?: { provider?: unknown, providers?: unknown } | null,
 *   user_metadata?: { nickname?: unknown } | null,
 * }} AuthUser
 * @typedef {{ nickname: boolean, email: boolean, provider: boolean }} Checks
 * @typedef {{ kind: "target" | "review" | "skip", checks: Checks, nickname: string | null }} Verdict
 */

/** 판정에 쓰는 닉네임: 프로필 닉네임이 있으면 그것, 없으면 가입 메타데이터 */
export function effectiveNickname(
  /** @type {AuthUser} */ user,
  /** @type {string | null | undefined} */ profileNickname,
) {
  if (typeof profileNickname === "string" && profileNickname !== "")
    return profileNickname;
  const meta = user.user_metadata?.nickname;
  return typeof meta === "string" && meta !== "" ? meta : null;
}

/**
 * 한 사용자 판정.
 * @param {AuthUser} user
 * @param {string | null | undefined} profileNickname
 * @param {{ emailDomain: string }} opts
 * @returns {Verdict}
 */
export function classifyUser(user, profileNickname, { emailDomain }) {
  const nickname = effectiveNickname(user, profileNickname);
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  const domain = `@${emailDomain.toLowerCase()}`;
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;
  const onlyEmail =
    provider === "email" &&
    (providers === undefined ||
      (Array.isArray(providers) &&
        providers.length > 0 &&
        providers.every((p) => p === "email")));

  /** @type {Checks} */
  const checks = {
    nickname: nickname !== null && nickname.startsWith(NICKNAME_PREFIX),
    email: email.startsWith(EMAIL_PREFIX) && email.endsWith(domain),
    provider: onlyEmail,
  };
  const hits = Object.values(checks).filter(Boolean).length;
  const kind = hits === 3 ? "target" : hits > 0 ? "review" : "skip";
  return { kind, checks, nickname };
}

/** 방장이 지워져 host_id가 null이 된 테스트 투표방만 (제목 test_ 접두) */
export function isOrphanTestPoll(
  /** @type {{ host_id?: string | null, title?: unknown }} */ poll,
) {
  return (
    (poll.host_id === null || poll.host_id === undefined) &&
    typeof poll.title === "string" &&
    poll.title.startsWith(POLL_TITLE_PREFIX)
  );
}

/** 출력용 짧은 id (앞 8자) */
export function shortId(/** @type {string} */ id) {
  return id.slice(0, 8);
}
