// service role(secret 키) Supabase 클라이언트 (T4.12 회원 탈퇴). 서버 전용: 클라이언트 번들에 들어가면 빌드가 실패한다.
// RLS를 우회하므로 Auth Admin API(사용자 삭제)처럼 사용자 세션으로 할 수 없는 일에만 쓴다.
// 세션을 저장하거나 갱신하지 않는다. 요청마다 새로 만든다.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "./types";

/** 연결 값이 없으면 null(탈퇴를 실패로 안내한다) */
export function createAdminSupabase() {
  const url = clientEnv().NEXT_PUBLIC_SUPABASE_URL;
  const secret = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
