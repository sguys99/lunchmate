// E2E 로그인 세션 헬퍼 (T4.22). 실제 OAuth(카카오, 네이버, 구글)를 거치지 않고, RLS 테스트 하네스(T4.5)와 같은 방법으로
// 클라우드 개발 프로젝트에 test_rls_ 접두 사용자를 만든 뒤 그 세션을 @supabase/ssr 쿠키 형식으로 브라우저에 넣는다.
//
// - RUN_DB_E2E=1일 때만 동작한다(pnpm test:e2e:onboarding이 켬). 평소 pnpm test:e2e는 클라우드 DB를 건드리지 않고 건너뛴다.
// - 필요한 값: .env.local의 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY(publishable), SUPABASE_SERVICE_ROLE_KEY(secret).
//   secret 키는 사용자 생성과 삭제(Auth Admin API)에만 쓴다. 화면과 단언은 사용자 세션(RLS 적용)으로 한다(CLAUDE.md 7.1).
// - 쿠키: 이름 sb-<project ref>-auth-token, 값 "base64-" + base64url(JSON 세션), 3180자를 넘으면 .0, .1로 나눈다
//   (@supabase/ssr createChunks, stringToBase64URL을 그대로 쓴다).
// - 테스트가 끝나면 사용자를 지운다. 남으면 pnpm test:rls:cleanup.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createChunks, stringToBase64URL } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";
import {
  createTestUserSession,
  deleteAuthUser,
  rest,
  type AuthSession,
  type RlsEnv,
  type TestUser,
} from "../../src/lib/supabase/rls/harness";

export function loadDbE2eEnv(): RlsEnv | null {
  if (process.env.RUN_DB_E2E !== "1") return null;
  const envFile = join(process.cwd(), ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secretKey) return null;
  return {
    url: url.replace(/\/$/, ""),
    publishableKey,
    secretKey,
    emailDomain: process.env.RLS_TEST_EMAIL_DOMAIN ?? "example.com",
  };
}

export function authCookieName(supabaseUrl: string): string {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export async function signInContext(
  context: BrowserContext,
  env: RlsEnv,
  baseURL: string,
  label: string,
): Promise<{
  user: TestUser;
  session: AuthSession;
  cleanup: () => Promise<void>;
}> {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const { user, session } = await createTestUserSession(env, runId, label);
  const value = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const chunks = createChunks(authCookieName(env.url), value);
  const { hostname } = new URL(baseURL);
  await context.addCookies(
    chunks.map((c) => ({
      name: c.name,
      value: c.value,
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
  return { user, session, cleanup: () => deleteAuthUser(env, user.id) };
}

/** 본인 세션으로 읽는다(RLS 적용) */
export async function readOwn<T>(
  env: RlsEnv,
  token: string,
  path: string,
): Promise<T> {
  const r = await rest<T>(env, path, { token });
  if (r.error) throw new Error(`[e2e] ${path} 읽기 실패 (${r.status})`);
  return r.data as T;
}
