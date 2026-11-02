"use server";
// 베타 의견 보내기 서버 액션 (T9.4, D-23). 흐름과 zod 검사는 requests.ts(테스트 있음).
// 사용자 세션(publishable 키 + 쿠키)으로 쓴다. RLS 본인 insert 정책 + 열 권한, 하루 한도와 정지 차단은 DB 트리거.
// 분석 이벤트는 보내지 않는다(D-23 안건 17).
import { APP_VERSION } from "@/lib/app-version";
import { isEnabled } from "@/lib/flags";
import { ALGO_VERSION } from "@/lib/reco/version";
import { createServerSupabase } from "@/lib/supabase/server";
import { submitBetaFeedback, type BetaFeedbackResult } from "./requests";

export async function sendBetaFeedbackAction(
  input: unknown,
): Promise<BetaFeedbackResult> {
  if (!isEnabled("auth") || !isEnabled("betaFeedback"))
    return { ok: false, error: "save" };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "save" };
  try {
    return await submitBetaFeedback(input, {
      async currentUserId() {
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? null;
      },
      appVersion: APP_VERSION,
      algoVersion: ALGO_VERSION,
      async insert(row) {
        const { error } = await supabase.from("beta_feedback").insert(row);
        return error;
      },
    });
  } catch {
    return { ok: false, error: "save" };
  }
}
