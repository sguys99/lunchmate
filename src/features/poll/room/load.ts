// 투표방 주소(/poll/<code>) 첫 렌더용 서버 읽기 (T7.15, POLL-05, POLL-11). 서버 컴포넌트가 부른다.
// poll_preview는 비로그인도 부를 수 있다(득표 없음, 비참여자 기준점은 약 150m 격자). 없는 코드는 null.
import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PollPreview } from "./model";
import { parsePreview } from "./parse";

export type PollPageData = {
  signedIn: boolean;
  /** null이면 없는 코드(또는 읽기 실패) */
  preview: PollPreview | null;
  /** 읽기 자체가 실패했는지(없는 코드와 구분해 다시 시도를 보인다) */
  failed: boolean;
};

const CODE_RE = /^[2-9a-hjkmnp-z]{12}$/;

export async function loadPollPage(code: string): Promise<PollPageData> {
  if (!CODE_RE.test(code))
    return { signedIn: false, preview: null, failed: false };
  const supabase = await createServerSupabase();
  if (!supabase) return { signedIn: false, preview: null, failed: true };
  const [{ data: user }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("poll_preview", { p_code: code }),
  ]);
  if (error)
    return { signedIn: Boolean(user.user), preview: null, failed: true };
  return {
    signedIn: Boolean(user.user),
    preview: parsePreview(data),
    failed: false,
  };
}
