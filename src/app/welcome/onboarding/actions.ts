"use server";
// 온보딩 저장 서버 액션 (T4.16~T4.21, ONB-01~05). 판단 흐름은 features/onboarding/submit.ts(테스트 있음).
// - 사용자 세션(publishable 키 + 쿠키)으로 쓴다. RLS 본인 정책 + 열 단위 권한(T4.4 마이그레이션).
// - 입력은 zod strictObject로 다시 검사한다. 사무실은 핀 좌표(lat, lng)와 이름 "회사"만 저장한다(T0.16, T0.18).
// - 서버 액션은 Next가 Origin 검사를 한다(CSRF).
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import { finishOnboarding } from "@/features/onboarding/submit";
import type {
  FinishOnboardingRequest,
  FinishOnboardingResponse,
} from "@/features/onboarding/request";

export async function finishOnboardingAction(
  input: FinishOnboardingRequest,
): Promise<FinishOnboardingResponse> {
  if (!isEnabled("auth")) return { ok: false, error: "save" };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "save" };

  return finishOnboarding(input, {
    async currentUserId() {
      // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async hasOffice(userId) {
      const { count, error } = await supabase
        .from("offices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    async updatePrefs(userId, prefs) {
      const { data, error } = await supabase
        .from("preferences")
        .update({
          lunch_budget: prefs.lunch,
          dinner_budget: prefs.dinner,
          walk_minutes: prefs.walk,
        })
        .eq("user_id", userId)
        .select("user_id");
      return !error && data?.length === 1;
    },
    async replaceAvoid(userId, rows) {
      const del = await supabase
        .from("avoid_rules")
        .delete()
        .eq("user_id", userId);
      if (del.error) return false;
      if (rows.length === 0) return true;
      const { error } = await supabase
        .from("avoid_rules")
        .insert(
          rows.map((r) => ({ user_id: userId, kind: r.kind, value: r.value })),
        );
      return !error;
    },
    async insertOffice(userId, office) {
      const { error } = await supabase.from("offices").insert({
        user_id: userId,
        name: office.name,
        lat: office.lat,
        lng: office.lng,
      });
      return !error;
    },
  });
}
