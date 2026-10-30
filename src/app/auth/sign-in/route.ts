// 로그인 시작 (T4.6, T4.7, T4.9). /login 화면의 브랜드 버튼 폼이 POST한다.
// 서버에서 signInWithOAuth를 불러 PKCE code verifier를 쿠키에 두고 제공자 인증 화면으로 303 이동한다.
// 브라우저 번들에 supabase-js를 싣지 않기 위해 서버에서 시작한다(홈 200KB 예산, research-notes T0.27).
// GET이 아니라 POST인 이유: 링크 미리 가져오기(prefetch)나 크롤러가 로그인을 시작하지 않게.
//
// 출처 (2026-10-30 확인): Supabase "OAuth PKCE flow" 서버 시작 예시(signInWithOAuth on server, 303 + Set-Cookie),
// supabase-js 2.118 Provider 타입의 `custom:${string}` (커스텀 OIDC provider)
import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { NEXT_COOKIE, nextCookieOptions } from "@/features/auth/next-cookie";
import { authOrigin, CALLBACK_PATH } from "@/features/auth/origin";
import { LOGIN_PROVIDERS, SUPABASE_PROVIDER } from "@/features/auth/providers";
import { sanitizeNext } from "@/features/auth/redirect";
import { loginUrl } from "@/features/auth/routes";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";

const formSchema = z.object({
  provider: z.enum(LOGIN_PROVIDERS),
  next: z.string().max(2048).optional(),
});

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!isEnabled("auth")) return new NextResponse(null, { status: 404 });

  const form = await request.formData().catch(() => null);
  const parsed = formSchema.safeParse({
    provider: form?.get("provider") ?? undefined,
    next: form?.get("next") ?? undefined,
  });
  const next = sanitizeNext(parsed.success ? parsed.data.next : null);
  const back = (error: string) =>
    NextResponse.redirect(new URL(loginUrl(next, error), request.url), {
      status: 303,
      headers: NO_STORE,
    });

  if (!parsed.success) return back("failed");

  const supabase = await createServerSupabase();
  if (!supabase) return back("failed");

  const origin = authOrigin(request.nextUrl.origin);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: SUPABASE_PROVIDER[parsed.data.provider],
    options: {
      redirectTo: `${origin}${CALLBACK_PATH}`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) return back("failed");

  const res = NextResponse.redirect(data.url, {
    status: 303,
    headers: NO_STORE,
  });
  res.cookies.set(
    NEXT_COOKIE,
    next,
    nextCookieOptions(request.nextUrl.protocol === "https:"),
  );
  return res;
}
