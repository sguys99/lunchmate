// 서버용 Supabase 클라이언트 (T4.6). Route Handler, 서버 컴포넌트, 서버 액션에서 쓴다.
// 세션은 @supabase/ssr이 쿠키(sb-<ref>-auth-token)에 둔다. 요청마다 새로 만든다(Fluid compute에서 전역 공유 금지).
// 키는 publishable(NEXT_PUBLIC_SUPABASE_ANON_KEY 자리)만 쓴다. RLS가 사용자 세션 기준으로 적용된다.
// secret 키(service role)는 여기서 쓰지 않는다.
//
// 출처 (2026-10-30 확인): Supabase "Creating a Supabase client for SSR" (Next.js, getAll/setAll, setAll의 캐시 헤더 인자),
// Context7 /supabase/supabase examples/auth/nextjs/lib/supabase/{server,proxy}.ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "./types";

export type SupabaseConfig = { url: string; publishableKey: string };

/** Supabase 연결 값. 없으면 null(로그인 기능을 끄고 안내만 한다) */
export function supabaseConfig(): SupabaseConfig | null {
  const env = clientEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/**
 * next/headers 쿠키에 묶인 서버 클라이언트. 연결 값이 없으면 null.
 * Route Handler에서는 쿠키 쓰기가 응답에 실리고, 서버 컴포넌트에서는 쓰기가 막혀 무시된다(갱신은 proxy가 맡는다).
 */
export async function createServerSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. proxy가 매 요청 세션을 갱신하므로 무시해도 된다.
        }
      },
    },
  });
}

export type ServerSupabase = NonNullable<
  Awaited<ReturnType<typeof createServerSupabase>>
>;
