// 로그인 왕복에 쓰는 사이트 주소 (T4.6). 도메인은 하드코딩하지 않고 NEXT_PUBLIC_SITE_URL에서 만든다(CLAUDE.md 12장).
// 개발 서버(next dev)는 포트가 여럿일 수 있어(3000, 3100) 요청이 들어온 주소를 쓴다.
// 어느 쪽이든 Supabase가 Redirect URLs 허용 목록과 대조하므로, 목록에 없는 주소는 Site URL로 돌아간다.
import { siteUrl } from "@/lib/env/site";

export function authOrigin(requestOrigin: string): string {
  if (process.env.NODE_ENV === "development") return requestOrigin;
  return siteUrl();
}

export const CALLBACK_PATH = "/auth/callback";

/**
 * 같은 출처에서 온 POST인가 (로그아웃, 탈퇴의 CSRF 방지). Origin 헤더가 있으면 요청 출처와 같아야 한다.
 * Origin이 없으면 Sec-Fetch-Site로 본다. strict면 둘 다 없을 때도 거부한다(탈퇴).
 */
export function isSameOriginPost(
  headers: Headers,
  requestOrigin: string,
  strict = false,
): boolean {
  const origin = headers.get("origin");
  if (origin)
    return origin === requestOrigin || origin === authOrigin(requestOrigin);
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  return !strict;
}
