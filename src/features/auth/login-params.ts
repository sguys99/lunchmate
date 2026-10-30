// /login 쿼리 해석 (T4.9). next는 다시 검사하고, 맥락과 오류는 정해진 값만 받는다.
import type { AuthLoginContext, AuthLoginError } from "@/copy/auth";
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
