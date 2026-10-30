// OAuth 콜백 (T4.6, T4.7, T4.9). Supabase Auth가 제공자 인증 뒤 ?code=(PKCE)로 이리 보낸다.
// 판단 흐름은 features/auth/complete-sign-in.ts(테스트 있음). 여기서는 Supabase와 쿠키를 잇기만 한다.
//
// 지키는 것
// - provider_token은 네이버 프로필 1회 조회에만 쓰고 저장, 로깅하지 않는다(CLAUDE.md 13장, T0.14).
// - next는 쿠키에서 꺼내 다시 검사하고 쿠키를 지운다(AUTH-03, 오픈 리다이렉트 방지).
// - 리다이렉트는 항상 우리 출처의 절대 URL로 만든다.
//
// 출처 (2026-10-30 확인): Supabase "OAuth PKCE flow" app/auth/callback/route.ts 예시(exchangeCodeForSession),
// Supabase social-login "Provider tokens"(provider_token은 교환 결과 세션에만 있고 DB에 저장되지 않음)
import { NextResponse, type NextRequest } from "next/server";
import { completeSignIn } from "@/features/auth/complete-sign-in";
import { fetchNaverProfile } from "@/features/auth/naver-profile";
import { NEXT_COOKIE, nextCookieOptions } from "@/features/auth/next-cookie";
import { authOrigin } from "@/features/auth/origin";
import { sanitizeNext } from "@/features/auth/redirect";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!isEnabled("auth")) return new NextResponse(null, { status: 404 });

  const { searchParams } = request.nextUrl;
  const next = sanitizeNext(request.cookies.get(NEXT_COOKIE)?.value);
  const supabase = await createServerSupabase();

  const result = await completeSignIn(
    {
      code: supabase ? searchParams.get("code") : null,
      error: supabase ? searchParams.get("error") : "unavailable",
      next,
    },
    {
      async exchange(code) {
        const { data, error } =
          await supabase!.auth.exchangeCodeForSession(code);
        if (error || !data.session || !data.user) return { ok: false };
        const provider = data.user.app_metadata?.provider;
        return {
          ok: true,
          userId: data.user.id,
          provider: typeof provider === "string" ? provider : null,
          providerToken: data.session.provider_token ?? null,
        };
      },
      async readProfile(userId) {
        const { data, error } = await supabase!
          .from("profiles")
          .select("nickname, avatar_url, terms_agreed_at")
          .eq("user_id", userId)
          .maybeSingle();
        return error ? null : data;
      },
      async updateProfile(userId, patch) {
        // RLS "profiles: 본인 수정" + 열 단위 권한(nickname, avatar_url)으로 사용자 세션이 직접 쓴다.
        const { error } = await supabase!
          .from("profiles")
          .update(patch)
          .eq("user_id", userId);
        return !error;
      },
      fetchNaverProfile: (token) => fetchNaverProfile(token),
      async hasOffice(userId) {
        const { count, error } = await supabase!
          .from("offices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        return error ? true : (count ?? 0) > 0;
      },
    },
  );

  // TODO(T4.29): result.outcome으로 login_completed 이벤트(provider만, 식별 정보 없음)

  const origin = authOrigin(request.nextUrl.origin);
  const res = NextResponse.redirect(new URL(result.location, origin), {
    headers: { "Cache-Control": "private, no-store" },
  });
  res.cookies.set(NEXT_COOKIE, "", {
    ...nextCookieOptions(request.nextUrl.protocol === "https:"),
    maxAge: 0,
  });
  return res;
}
