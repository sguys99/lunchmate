"use server";
// 나 탭 기록 서버 액션 (T6.13, HIS-01). 사용자 세션(publishable 키 + 쿠키), RLS 본인 정책. service role 없음.
// 가장 오래된 방문일 하나만 읽는다. 기록 "더 보기"가 언제 끝나는지, 첫 방문 빈 상태인지를 2주씩 거슬러 묻지 않고 정한다.
// 응답에는 날짜 키만 있다(장소 값, 좌표 없음, CLAUDE.md 7장).
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";

export type OldestVisitResult =
  { signedIn: false } | { signedIn: true; oldest: string | null };

/** 내 가장 오래된 방문일(KST 날짜 키). 기록이 없으면 null. DB 오류면 throw(TanStack Query 오류 상태) */
export async function myOldestVisitAction(): Promise<OldestVisitResult> {
  if (!isEnabled("auth")) return { signedIn: false };
  const supabase = await createServerSupabase();
  if (!supabase) return { signedIn: false };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { signedIn: false };
  const { data, error } = await supabase
    .from("visits")
    .select("visited_on")
    .eq("user_id", userId)
    .order("visited_on", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("load");
  return { signedIn: true, oldest: data?.visited_on ?? null };
}
