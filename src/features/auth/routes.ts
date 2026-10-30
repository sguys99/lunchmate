// 로그인이 필요한 경로 규칙 (T4.8, PRD AUTH-07). proxy와 테스트가 함께 쓰는 순수 함수.
//
// 결정 (2026-10-30, T4.8)
// - 비로그인 둘러보기(AUTH-07)는 "추천 체험만 허용"이므로 오늘(/today)과 지도(/map)는 열어 둔다.
//   저장, 후기, 투표 같은 행동은 화면 안에서 로그인 유도 시트(T4.13)로 막는다.
// - 나(/me)는 설정과 기록이라 로그인 필요.
// - 투표 탭(/poll)은 내 투표방 목록과 만들기라 로그인 필요. 단 초대 링크 /poll/<code>는 비로그인도 미리보기를
//   볼 수 있어야 하므로(PRD POLL, CLAUDE.md 4장 (public)) 열어 두고, 참여 단계에서 화면이 로그인을 부른다.
//   /poll/new처럼 만들기 하위 경로는 로그인 필요.
// - 약관 자리(/welcome/*)와 관리자(/admin)는 로그인 필요(관리자 role 판정은 그 화면에서 따로).
// - /login은 로그인 상태면 next로 보낸다(proxy).

import { sanitizeNext } from "./redirect";

export const LOGIN_PATH = "/login";
export const TERMS_PATH = "/welcome/terms";

/** 이 경로 자체와 그 아래 전부 로그인 필요 */
const PROTECTED_ROOTS = ["/me", "/welcome", "/admin"] as const;
/** 정확히 이 경로만 로그인 필요 (하위는 개별 규칙) */
const PROTECTED_EXACT = ["/poll"] as const;
/** 하위 경로까지 로그인 필요한 투표 경로 */
const PROTECTED_POLL_CHILDREN = ["/poll/new"] as const;

function underRoot(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

/** 로그인해야 볼 수 있는 경로인가 */
export function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_ROOTS.some((r) => underRoot(pathname, r))) return true;
  if ((PROTECTED_EXACT as readonly string[]).includes(pathname)) return true;
  if (pathname === "/poll/") return true;
  return PROTECTED_POLL_CHILDREN.some((r) => underRoot(pathname, r));
}

/** 로그인 화면인가 (로그인 상태로 오면 next로 보낸다) */
export function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === `${LOGIN_PATH}/`;
}

/** 로그인 화면 주소. next는 호출하는 쪽이 이미 검사했거나, 로그인 화면이 다시 검사한다 */
export function loginUrl(next: string, error?: string): string {
  const params = new URLSearchParams({ next });
  if (error) params.set("error", error);
  return `${LOGIN_PATH}?${params.toString()}`;
}

export type ProxyDecision =
  { type: "pass" } | { type: "redirect"; location: string };

/**
 * proxy가 할 일을 정한다 (순수 함수). location은 같은 사이트 안 경로(+쿼리)다.
 * - 보호 경로 + 비로그인 → /login?next=<지금 경로>
 * - /login + 로그인 → next(검사 후) 또는 기본 경로
 */
export function decideProxy(input: {
  pathname: string;
  search: string;
  signedIn: boolean;
  /** /login의 next 쿼리 (검사 전 원본) */
  nextParam: string | null;
}): ProxyDecision {
  const { pathname, search, signedIn } = input;
  if (!signedIn && isProtectedPath(pathname)) {
    return {
      type: "redirect",
      location: loginUrl(sanitizeNext(`${pathname}${search}`)),
    };
  }
  if (signedIn && isLoginPath(pathname)) {
    return { type: "redirect", location: sanitizeNext(input.nextParam) };
  }
  return { type: "pass" };
}

/** 세션 쿠키가 있어 보이는가. 없으면 proxy가 Supabase를 부르지 않고 비로그인으로 본다(둘러보기 첫 로드 비용 0) */
export function hasSessionCookie(names: readonly string[]): boolean {
  return names.some(
    (n) => n.startsWith("sb-") && /-auth-token(\.\d+)?$/.test(n),
  );
}
