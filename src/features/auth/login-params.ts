// /login 쿼리 해석 (T4.9). next는 다시 검사하고, 맥락과 오류는 정해진 값만 받는다.
import type { AuthLoginContext, AuthLoginError } from "@/copy/auth";
import {
  detectInApp,
  detectOs,
  isInApp,
  type InApp,
  type MobileOs,
} from "@/lib/inapp";
import { sanitizeNext } from "./redirect";

type Raw = string | string[] | undefined;

function first(v: Raw): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** next가 가리키는 곳으로 화면 맥락을 고른다. 초대 링크(/poll/<code>)면 투표 참여 */
export function loginContext(next: string): AuthLoginContext {
  const pathname = next.split("?")[0]!;
  if (/^\/poll\/[^/]+/.test(pathname) && !pathname.startsWith("/poll/new")) {
    return "poll";
  }
  if (pathname === "/me" || pathname.startsWith("/me/")) return "me";
  return "default";
}

export function parseLoginParams(params: Record<string, Raw>): {
  next: string;
  context: AuthLoginContext;
  error: AuthLoginError | null;
} {
  const next = sanitizeNext(first(params.next));
  const e = first(params.error);
  const error: AuthLoginError | null =
    e === "cancelled" ? "cancelled" : e === undefined ? null : "failed";
  return { next, context: loginContext(next), error };
}

/** /login이 보여 줄 화면: 로그인 방법(기본) 또는 인앱 구글 안내(T4.10, /auth/sign-in 이중 안전장치가 보냄) */
export type LoginView = "login" | "inapp";

export type InAppEnv = { inApp: InApp | null; os: MobileOs | null };

/**
 * 인앱 판정. 기본은 요청 UA(서버에서 판정해 첫 렌더부터 같은 화면). allowOverride(개발 환경만)면
 * ?inapp=kakaotalk|line|instagram|facebook|naver|webview, ?os=ios|android 로 흉내 낼 수 있다(화면 확인용).
 */
export function resolveInAppEnv(
  params: Record<string, Raw>,
  ua: string | null,
  allowOverride: boolean,
): InAppEnv {
  const uaEnv: InAppEnv = { inApp: detectInApp(ua), os: detectOs(ua) };
  if (!allowOverride) return uaEnv;
  const fake = first(params.inapp);
  if (!isInApp(fake)) return uaEnv;
  const os = first(params.os);
  return { inApp: fake, os: os === "android" ? "android" : "ios" };
}

export function parseLoginView(params: Record<string, Raw>): LoginView {
  return first(params.view) === "inapp" ? "inapp" : "login";
}
