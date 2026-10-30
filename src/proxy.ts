// Next 16 Proxy (구 middleware, T4.8). 세션 쿠키 갱신과 로그인 필요 경로 보호를 한다.
// 경로 규칙과 판정은 src/features/auth/routes.ts(순수 함수, 테스트 있음)에 있다.
//
// - 세션 쿠키가 없으면 Supabase를 부르지 않는다. 비로그인 둘러보기(/, /today)의 첫 로드에 네트워크 왕복을 더하지 않는다.
// - 쿠키가 있으면 createServerClient 직후 getClaims()로 토큰을 검증하고(필요하면 갱신), setAll이 마지막으로 만든 응답을
//   그대로 돌려준다. 다른 응답(리다이렉트)을 돌려줄 때는 쿠키와 캐시 헤더를 옮겨 싣는다(안 하면 다음 요청에서 로그아웃).
// - 약관 동의 확인(T4.11): 로그인 사용자가 앱 경로(isTermsGatedPath)에 오면 동의 확인 쿠키(lm_terms = 사용자 id)를 본다.
//   없으면 profiles.terms_agreed_at을 한 번 읽어, 동의했으면 쿠키를 적고 통과, 아니면 /welcome/terms?next=<지금 경로>.
//   비로그인 요청은 위에서 이미 끝나므로 DB를 부르지 않고, 로그인 사용자도 세션마다 처음 한 번만 부른다.
//   읽기에 실패하면 통과시킨다(가용성 우선, 약관 화면과 쓰기 기능이 다시 확인).
// - flags.auth가 꺼진 환경(프로덕션)에서는 아무것도 하지 않는다. 그때 (app) 화면은 appShell 플래그로 404다.
//
// 출처 (2026-10-30 확인): node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// ("middleware" 파일 이름은 deprecated, proxy.ts + export function proxy), Supabase SSR 가이드 "Hook up proxy"
// (Context7 /supabase/supabase examples/auth/nextjs/lib/supabase/proxy.ts)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  decideProxy,
  hasSessionCookie,
  isTermsGatedPath,
  termsUrl,
  type ProxyDecision,
} from "@/features/auth/routes";
import {
  TERMS_COOKIE,
  termsCookieMatches,
  termsCookieOptions,
} from "@/features/auth/terms-cookie";
import { isEnabled } from "@/lib/flags";
import { clientEnv } from "@/lib/env/client";

const CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

function redirectTo(
  request: NextRequest,
  decision: Extract<ProxyDecision, { type: "redirect" }>,
  carry?: NextResponse,
): NextResponse {
  const res = NextResponse.redirect(new URL(decision.location, request.url));
  if (carry) {
    for (const c of carry.cookies.getAll()) res.cookies.set(c);
    for (const h of CACHE_HEADERS) {
      const v = carry.headers.get(h);
      if (v) res.headers.set(h, v);
    }
  }
  return res;
}

export async function proxy(request: NextRequest) {
  if (!isEnabled("auth")) return NextResponse.next({ request });

  const { pathname, search, searchParams } = request.nextUrl;
  const base = {
    pathname,
    search,
    nextParam: searchParams.get("next"),
  };

  const env = clientEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const names = request.cookies.getAll().map((c) => c.name);

  if (!url || !key || !hasSessionCookie(names)) {
    const decision = decideProxy({ ...base, signedIn: false });
    return decision.type === "redirect"
      ? redirectTo(request, decision)
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [k, v] of Object.entries(headers)) {
          response.headers.set(k, v);
        }
      },
    },
  });

  // createServerClient와 getClaims 사이에 다른 코드를 넣지 않는다(Supabase 가이드: 무작위 로그아웃 방지).
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  const signedIn = Boolean(sub);

  const decision = decideProxy({ ...base, signedIn });
  if (decision.type === "redirect") {
    return redirectTo(request, decision, response);
  }

  if (
    sub &&
    isTermsGatedPath(pathname) &&
    !termsCookieMatches(request.cookies.get(TERMS_COOKIE)?.value, sub)
  ) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("terms_agreed_at")
      .eq("user_id", sub)
      .maybeSingle<{ terms_agreed_at: string | null }>();
    if (!error && profile && !profile.terms_agreed_at) {
      return redirectTo(
        request,
        { type: "redirect", location: termsUrl(`${pathname}${search}`) },
        response,
      );
    }
    if (!error && profile?.terms_agreed_at) {
      response.cookies.set(
        TERMS_COOKIE,
        sub,
        termsCookieOptions(request.nextUrl.protocol === "https:"),
      );
    }
  }
  return response;
}

export const config = {
  matcher: [
    // 정적 파일, 이미지 최적화, 확장자가 있는 공개 파일은 건너뛴다.
    // /auth/callback은 직접 세션 쿠키를 쓰므로 proxy가 먼저 갱신하지 않게 뺀다.
    "/((?!_next/static|_next/image|auth/callback|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|txt|xml|webmanifest|js|css|map)$).*)",
  ],
};
