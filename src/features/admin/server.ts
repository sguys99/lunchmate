// 관리자 서버 도구 (T8.5, MOD-06). 서버 컴포넌트와 서버 액션 전용.
// 가드 세 겹(g8-comparison-admin.md 5절 안건 2): proxy가 /admin 로그인 확인(T4.8), 레이아웃이 role 확인 후 아니면 404,
// 모든 데이터와 처리는 첫 줄에서 관리자를 확인하는 admin_* 보안 함수로만. service role 키는 쓰지 않는다.
import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { PgErrorLike } from "@/lib/supabase/db-errors";
import { createServerSupabase, type ServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type AdminSession = {
  supabase: ServerSupabase;
  userId: string;
  nickname: string | null;
};

/**
 * 지금 세션이 관리자면 세션, 아니면 null(비로그인, 일반 사용자, 연결 값 없음, 읽기 실패).
 * 같은 요청 안에서는 한 번만 읽는다(레이아웃과 페이지가 함께 부른다).
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  // supabase-js가 만들어질 때 Date.now()를 읽는다. 요청 시점 렌더임을 먼저 밝힌다(cacheComponents)
  await connection();
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, nickname")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || profile?.role !== "admin") return null;
  return { supabase, userId, nickname: profile.nickname };
});

type Fns = Database["public"]["Functions"];
/** admin_* 보안 함수 이름 (생성 타입 src/lib/supabase/types.ts에서) */
export type AdminRpcName = Extract<keyof Fns, `admin_${string}`>;

/**
 * admin_* 보안 함수 호출. 이름과 인자는 생성 타입으로 검사하고, 응답은 unknown으로 돌려 부르는 쪽이
 * model.ts zod 스키마로 검사한다. 생성 타입은 함수 반환 열을 모두 non-null로 적지만(body, rating, nickname 등은
 * 실제로 null일 수 있다) jsonb 열(reasons, recent_items)은 Json이라, 화면 모양은 zod가 정한다.
 */
export async function callAdminRpc<F extends AdminRpcName>(
  supabase: ServerSupabase,
  fn: F,
  ...args: [Fns[F]["Args"]] extends [never] ? [] : [Fns[F]["Args"]]
): Promise<{ data: unknown; error: PgErrorLike }> {
  const { data, error } = await supabase.rpc(fn, args[0]);
  return { data: data as unknown, error };
}
