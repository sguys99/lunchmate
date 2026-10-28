// 서버 전용 환경변수. 이 파일을 클라이언트 컴포넌트에서 import하면 빌드가 실패한다.
// Next가 'server-only'를 내부 alias로 처리하므로 별도 패키지 설치가 필요 없다(공식 문서: 설치는 선택).
import "server-only";
import * as z from "zod";
import {
  EnvValidationError,
  SERVER_ENV_KEYS,
  cleanEnv,
  findMissingRequired,
  type EnvProblem,
  type RuntimeInfo,
  type ServerEnvKey,
} from "./keys";
import { clientEnv } from "./client";

const optionalString = z.string().optional();

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_PROJECT_REF: optionalString,
  NAVER_LOGIN_CLIENT_ID: optionalString,
  NAVER_LOGIN_CLIENT_SECRET: optionalString,
  SENTRY_DSN: z
    .url({ error: "http(s)로 시작하는 올바른 URL이어야 합니다." })
    .optional(),
});

export type ServerEnv = z.output<typeof serverSchema>;

/** 순수 함수: 주어진 값을 검증한다(테스트용으로 분리). 실패 시 EnvValidationError. */
export function parseServerEnv(
  source: Partial<Record<ServerEnvKey, string | undefined>>,
  info: RuntimeInfo,
): ServerEnv {
  const cleaned = cleanEnv(
    Object.fromEntries(SERVER_ENV_KEYS.map((k) => [k, source[k]])) as Record<
      ServerEnvKey,
      string | undefined
    >,
  );
  const problems: EnvProblem[] = findMissingRequired(
    cleaned,
    SERVER_ENV_KEYS,
    info,
  );
  const result = serverSchema.safeParse(cleaned);
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push({
        key: String(issue.path[0] ?? "(알 수 없음)"),
        message: issue.message,
      });
    }
  }
  if (problems.length > 0 || !result.success)
    throw new EnvValidationError("서버", problems);
  return result.data;
}

let cached: ServerEnv | undefined;

/** 검증된 서버 환경변수(비밀키 포함). 서버 코드에서만 호출한다. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  cached = parseServerEnv(
    {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
      NAVER_LOGIN_CLIENT_ID: process.env.NAVER_LOGIN_CLIENT_ID,
      NAVER_LOGIN_CLIENT_SECRET: process.env.NAVER_LOGIN_CLIENT_SECRET,
      SENTRY_DSN: process.env.SENTRY_DSN,
    },
    {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PHASE: process.env.NEXT_PHASE,
    },
  );
  return cached;
}

/** 서버 시작 시 서버와 클라이언트 환경변수를 모두 검증한다(src/instrumentation.ts에서 호출). */
export function validateAllEnv(): void {
  serverEnv();
  clientEnv();
}

/** 테스트 전용: 캐시 초기화 */
export function resetServerEnvCache(): void {
  cached = undefined;
}
