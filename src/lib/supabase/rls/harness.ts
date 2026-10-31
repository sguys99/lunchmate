// RLS 테스트 공용 도구 (T4.5). 테스트 전용 파일이며 앱 코드에서 가져오지 않는다.
//
// 원칙 (CLAUDE.md 7.1, 10장)
// - 단언(assert)은 모두 publishable 키 + 테스트 사용자 세션(또는 세션 없음 = 비로그인)으로 한다.
//   service role(secret 키)로 읽으면 RLS를 건너뛰므로 권한 검증에 쓰지 않는다.
// - secret 키는 테스트 사용자를 만들고 지우는 준비, 정리에만 쓴다(Auth Admin API).
// - 테스트 사용자는 닉네임과 이메일이 `test_`로 시작한다. 정리 스크립트(scripts/rls-cleanup.mjs)가 이 접두로 찾아 지운다.
// - @supabase/supabase-js 없이 fetch만 쓴다(의존성 추가 없음).
import { existsSync } from "node:fs";
import { join } from "node:path";

export type RlsEnv = {
  url: string;
  publishableKey: string;
  secretKey: string;
  emailDomain: string;
};

export type RestResult<T = unknown> = {
  status: number;
  data: T | null;
  error: { code?: string; message?: string } | null;
};

export type TestUser = {
  id: string;
  email: string;
  nickname: string;
  token: string;
};

export const TEST_PREFIX = "test_";

/**
 * 테스트 실행 구분자. 파일들이 나란히 돌아 같은 밀리초에 시작하면 시각만으로는 겹쳐
 * 이메일 중복(users_email_partial_key)으로 실패하므로 난수 2자를 붙인다(T5.42).
 */
export function newRunId(): string {
  return (
    Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 4)
  );
}

/**
 * RLS 테스트 실행 조건. 하나라도 빠지면 null을 돌려 테스트를 건너뛴다.
 * - RUN_RLS_TESTS=1 (pnpm test:rls가 켬). 평소 pnpm test와 pre-push는 클라우드 DB를 건드리지 않는다.
 * - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY(publishable), SUPABASE_SERVICE_ROLE_KEY(secret)
 */
export function loadRlsEnv(): RlsEnv | null {
  if (process.env.RUN_RLS_TESTS !== "1") return null;
  const envFile = join(process.cwd(), ".env.local");
  if (existsSync(envFile)) {
    // 이미 있는 값은 덮어쓰지 않는다
    process.loadEnvFile(envFile);
  }
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

async function parse<T>(res: Response): Promise<RestResult<T>> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (res.ok) return { status: res.status, data: body as T, error: null };
  const err = (body ?? {}) as {
    code?: unknown;
    message?: unknown;
    msg?: unknown;
  };
  return {
    status: res.status,
    data: null,
    error: {
      code: typeof err.code === "string" ? err.code : String(err.code ?? ""),
      message:
        typeof err.message === "string"
          ? err.message
          : typeof err.msg === "string"
            ? err.msg
            : undefined,
    },
  };
}

type RestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** 사용자 access token. 없으면 비로그인(anon) 요청 */
  token?: string;
  body?: unknown;
  /** 기본값 return=representation: 영향받은 행을 돌려받아 0행인지 확인한다 */
  prefer?: string;
};

/** PostgREST 요청. apikey는 항상 publishable 키(사용자 권한 그대로) */
export async function rest<T = unknown>(
  env: RlsEnv,
  path: string,
  {
    method = "GET",
    token,
    body,
    prefer = "return=representation",
  }: RestOptions = {},
): Promise<RestResult<T>> {
  const headers: Record<string, string> = {
    apikey: env.publishableKey,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${env.url}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(res);
}

/** 마이그레이션이 적용됐는지: 적용 전에는 PostgREST가 PGRST205(테이블 없음)를 돌려준다 */
export async function schemaReady(
  env: RlsEnv,
  table: string,
): Promise<boolean> {
  try {
    const r = await rest(env, `${table}?select=user_id&limit=1`);
    if (r.error?.code === "PGRST205" || r.status === 404) return false;
    return true;
  } catch {
    return false;
  }
}

// ── Auth Admin (secret 키, 준비와 정리 전용) ──────────────────────────

function adminHeaders(env: RlsEnv): Record<string, string> {
  // 새 secret 키는 JWT가 아니므로 apikey 헤더로만 보낸다(Authorization Bearer 금지)
  return { apikey: env.secretKey, "Content-Type": "application/json" };
}

function randomPassword(): string {
  return `Pw-${crypto.randomUUID()}`;
}

async function createAuthUser(
  env: RlsEnv,
  email: string,
  password: string,
  nickname: string,
): Promise<string> {
  const res = await fetch(`${env.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(env),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname },
    }),
  });
  const r = await parse<{ id: string }>(res);
  if (!r.data?.id) {
    throw new Error(
      `[rls] 테스트 사용자 생성 실패 (${r.status} ${r.error?.message ?? ""})`,
    );
  }
  return r.data.id;
}

export async function deleteAuthUser(env: RlsEnv, id: string): Promise<void> {
  await fetch(`${env.url}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders(env),
  });
}

/**
 * 세션 발급. 1순위 비밀번호 로그인, 실패하면 2순위 매직 링크 해시 검증.
 * 개발 프로젝트는 Email provider가 꺼져 있다(2026-10-30 /auth/v1/settings 기준).
 * 둘 다 실패하면 대시보드 Authentication > Sign In / Providers에서 Email을 켜되
 * "Allow new users to sign up"은 끄고 확인 메일을 유지하는 방법을 안내한다.
 */
/** Auth 세션 응답(비밀번호 로그인, 매직 링크 검증 공통). E2E가 브라우저 세션 쿠키를 만들 때 쓴다 */
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string } & Record<string, unknown>;
};

async function signIn(
  env: RlsEnv,
  email: string,
  password: string,
): Promise<string> {
  return (await signInSession(env, email, password)).access_token;
}

async function signInSession(
  env: RlsEnv,
  email: string,
  password: string,
): Promise<AuthSession> {
  const pw = await parse<AuthSession>(
    await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: env.publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }),
  );
  if (pw.data?.access_token) return pw.data;

  const link = await parse<{
    hashed_token?: string;
    properties?: { hashed_token?: string };
  }>(
    await fetch(`${env.url}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: adminHeaders(env),
      body: JSON.stringify({ type: "magiclink", email }),
    }),
  );
  const tokenHash =
    link.data?.hashed_token ?? link.data?.properties?.hashed_token;
  if (tokenHash) {
    const verified = await parse<AuthSession>(
      await fetch(`${env.url}/auth/v1/verify`, {
        method: "POST",
        headers: {
          apikey: env.publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "email", token_hash: tokenHash }),
      }),
    );
    if (verified.data?.access_token) return verified.data;
  }

  throw new Error(
    `[rls] 테스트 사용자 세션을 만들지 못했습니다. 비밀번호 로그인(${pw.status} ${pw.error?.message ?? ""})과 ` +
      "매직 링크 검증이 모두 실패했습니다. 개발 프로젝트에서 Email provider를 켜고(신규 가입은 끔) 다시 실행하세요.",
  );
}

/**
 * 정해진 이메일로 테스트 사용자 생성 + 세션 발급. 탈퇴 후 같은 계정 재가입(AC-AUTH-3)처럼 이메일을 다시 써야 할 때.
 * 이메일은 정리 스크립트가 찾도록 test_rls_로 시작해야 한다.
 */
export async function createTestUserWithEmail(
  env: RlsEnv,
  email: string,
  nickname: string,
): Promise<TestUser> {
  if (!email.startsWith(`${TEST_PREFIX}rls_`)) {
    throw new Error("[rls] 테스트 이메일은 test_rls_로 시작해야 합니다");
  }
  const password = randomPassword();
  const id = await createAuthUser(env, email, password, nickname);
  try {
    const token = await signIn(env, email, password);
    return { id, email, nickname, token };
  } catch (e) {
    await deleteAuthUser(env, id);
    throw e;
  }
}

/** 테스트 사용자 생성 + 세션 발급. label은 a, b 같은 짧은 이름 */
export async function createTestUser(
  env: RlsEnv,
  runId: string,
  label: string,
): Promise<TestUser> {
  const nickname = `${TEST_PREFIX}${label}_${runId}`.slice(0, 20);
  const email = `${TEST_PREFIX}rls_${runId}_${label}@${env.emailDomain}`;
  const password = randomPassword();
  const id = await createAuthUser(env, email, password, nickname);
  try {
    const token = await signIn(env, email, password);
    return { id, email, nickname, token };
  } catch (e) {
    await deleteAuthUser(env, id);
    throw e;
  }
}

/** 탈퇴 cascade 확인처럼 RLS 밖에서 "행이 남았는지"만 셀 때 쓴다. 권한 단언에는 쓰지 않는다 */
export async function adminCount(
  env: RlsEnv,
  table: string,
  userId: string,
): Promise<number> {
  const res = await fetch(
    `${env.url}/rest/v1/${table}?select=user_id&user_id=eq.${userId}`,
    {
      headers: { ...adminHeaders(env), Prefer: "count=exact" },
      method: "HEAD",
    },
  );
  const range = res.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1]);
  if (!Number.isFinite(total))
    throw new Error(`[rls] ${table} 개수 조회 실패 (${res.status})`);
  return total;
}

/**
 * 테스트 사용자 생성 + 전체 세션(refresh_token 포함). E2E(e2e/helpers/session.ts)가 브라우저 쿠키로 넣는다.
 * 이메일은 test_rls_로 시작해 정리 스크립트(pnpm test:rls:cleanup)가 지운다.
 */
export async function createTestUserSession(
  env: RlsEnv,
  runId: string,
  label: string,
): Promise<{ user: TestUser; session: AuthSession }> {
  const nickname = `${TEST_PREFIX}${label}_${runId}`.slice(0, 20);
  const email = `${TEST_PREFIX}rls_${runId}_${label}@${env.emailDomain}`;
  const password = randomPassword();
  const id = await createAuthUser(env, email, password, nickname);
  try {
    const session = await signInSession(env, email, password);
    return {
      user: { id, email, nickname, token: session.access_token },
      session,
    };
  } catch (e) {
    await deleteAuthUser(env, id);
    throw e;
  }
}
