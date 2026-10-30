"use server";
// 약관 동의 저장 서버 액션 (T4.11, PRD AUTH-02, AUTH-06). 판단 흐름은 features/auth/terms-submit.ts(테스트 있음).
// - 사용자 세션(publishable 키 + 쿠키)으로 profiles를 고친다. RLS "profiles: 본인 수정" + 열 단위 권한.
// - 동의 시각은 DB 트리거가 서버 now()로 바꾸고 한 번만 기록한다(T4.4). 여기서 넣는 값은 "null 아님" 표시일 뿐이다.
// - 성공하면 동의 확인 쿠키를 적고 next(또는 온보딩, T4.16)로 보낸다. 실패하면 화면이 고른 항목 그대로 다시 누르기를 안내한다.
// 서버 액션은 Next가 Origin 검사를 한다(CSRF).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginUrl } from "@/features/auth/routes";
import { TERMS_COOKIE, termsCookieOptions } from "@/features/auth/terms-cookie";
import { ONBOARDING_PATH } from "@/features/auth/terms";
import { submitTerms } from "@/features/auth/terms-submit";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";

export type TermsActionState = {
  error: "invalid" | "save" | null;
};

export async function agreeToTerms(
  _prev: TermsActionState,
  formData: FormData,
): Promise<TermsActionState> {
  if (!isEnabled("auth")) return { error: "save" };
  const supabase = await createServerSupabase();
  if (!supabase) return { error: "save" };

  const input: Record<string, unknown> = {};
  for (const key of ["age", "service", "privacy", "next"] as const) {
    const v = formData.get(key);
    if (typeof v === "string") input[key] = v;
  }

  let agreedUser: string | null = null;
  const result = await submitTerms(input, {
    async currentUserId() {
      // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async recordConsent(userId) {
      // 트리거가 서버 시각으로 바꾼다. 클라이언트 시각을 믿지 않는다.
      const marker = new Date().toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .update({ terms_agreed_at: marker, birth_confirmed_at: marker })
        .eq("user_id", userId)
        .select("user_id");
      const ok = !error && data?.length === 1;
      if (ok) agreedUser = userId;
      return ok;
    },
    async hasOffice(userId) {
      // 온보딩 화면(T4.16)이 생기기 전에는 묻지 않는다(DB 왕복 절약)
      if (!ONBOARDING_PATH) return true;
      const { count, error } = await supabase
        .from("offices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      return error ? true : (count ?? 0) > 0;
    },
  });

  if (result.ok) {
    if (agreedUser) {
      const jar = await cookies();
      jar.set(
        TERMS_COOKIE,
        agreedUser,
        termsCookieOptions(process.env.NODE_ENV === "production"),
      );
    }
    redirect(result.location);
  }
  if (result.error === "unauthenticated") redirect(loginUrl(result.next));
  return { error: result.error };
}
