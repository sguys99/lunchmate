// 로그아웃 (T4.12, PRD AUTH-05). 나 탭의 로그아웃과 약관 화면의 "나중에 하기"(D-08 안건 9)가 폼으로 POST한다.
// 이 기기의 세션만 끝낸다(scope local). 세션 쿠키와 약관 확인 쿠키를 지우고 next(기본 /today, 둘러보기)로 303.
// 같은 출처 POST만 받는다(다른 사이트가 사용자를 로그아웃시키지 못하게).
//
// 출처 (2026-10-30 확인): Supabase "Sign out" (signOut scope: global | local | others, 기본 global),
// @supabase/ssr 서버 클라이언트는 signOut 때 setAll로 세션 쿠키를 지운다.
import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginPost } from "@/features/auth/origin";
import { sanitizeNext } from "@/features/auth/redirect";
import { TERMS_COOKIE } from "@/features/auth/terms-cookie";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!isEnabled("auth")) return new NextResponse(null, { status: 404 });
  if (!isSameOriginPost(request.headers, request.nextUrl.origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const rawNext = form?.get("next");
  const next = sanitizeNext(typeof rawNext === "string" ? rawNext : null);

  const supabase = await createServerSupabase();
  // 실패해도(이미 만료된 세션 등) 쿠키는 지우고 둘러보기로 보낸다
  await supabase?.auth.signOut({ scope: "local" }).catch(() => null);

  const res = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
    headers: NO_STORE,
  });
  res.cookies.delete(TERMS_COOKIE);
  return res;
}
