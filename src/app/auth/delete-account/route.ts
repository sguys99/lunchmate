// 회원 탈퇴 (T4.12, PRD AUTH-05, 11.4절, AC-AUTH-3). 나 탭 계정 화면(/me/account)의 확인 대화상자가 폼으로 POST한다.
// 흐름은 features/auth/delete-account.ts(단위 테스트, RLS 통합 테스트 t4-delete-account가 같은 함수를 부름).
//
// 지키는 것
// - 같은 출처 POST만(Origin 또는 Sec-Fetch-Site 필수), 폼의 confirm=delete 확인 값(zod).
// - 지울 사용자는 폼이 아니라 세션에서 정한다. getUser로 Auth 서버 검증을 다시 받는다.
// - service role 키는 src/lib/supabase/admin.ts(server-only)에서만 읽는다. 응답, 로그에 내보내지 않는다.
// - 지운 뒤 이 기기 세션 쿠키와 약관 확인 쿠키를 지우고 둘러보기(/today)로 303.
//
// 출처 (2026-10-30 확인): Supabase JS "auth.admin.deleteUser(id, shouldSoftDelete)" (service_role 필요, 서버 전용),
// Supabase "User management > Deleting users"(auth.users 삭제 시 참조 테이블은 on delete cascade로 함께 정리)
import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { adminDeleter, deleteAccount } from "@/features/auth/delete-account";
import { isSameOriginPost } from "@/features/auth/origin";
import { loginUrl } from "@/features/auth/routes";
import { TERMS_COOKIE } from "@/features/auth/terms-cookie";
import { isEnabled } from "@/lib/flags";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };
const ACCOUNT_PATH = "/me/account";
const formSchema = z.object({ confirm: z.literal("delete") });

export async function POST(request: NextRequest) {
  if (!isEnabled("auth")) return new NextResponse(null, { status: 404 });
  if (!isSameOriginPost(request.headers, request.nextUrl.origin, true)) {
    return new NextResponse(null, { status: 403 });
  }
  const go = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), {
      status: 303,
      headers: NO_STORE,
    });

  const form = await request.formData().catch(() => null);
  if (!formSchema.safeParse({ confirm: form?.get("confirm") }).success) {
    return go(`${ACCOUNT_PATH}?error=delete`);
  }

  const supabase = await createServerSupabase();
  const admin = createAdminSupabase();
  if (!supabase || !admin) return go(`${ACCOUNT_PATH}?error=delete`);

  const result = await deleteAccount({
    async verifiedUserId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    deleteUser: adminDeleter(admin),
  });

  if (!result.ok) {
    return result.reason === "unauthenticated"
      ? go(loginUrl(ACCOUNT_PATH))
      : go(`${ACCOUNT_PATH}?error=delete`);
  }

  // 사용자는 이미 없다. 서버 로그아웃 호출이 실패해도 local scope는 쿠키를 지운다.
  await supabase.auth.signOut({ scope: "local" }).catch(() => null);
  const res = go("/today");
  res.cookies.delete(TERMS_COOKIE);
  return res;
}
