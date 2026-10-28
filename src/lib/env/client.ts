// 클라이언트에 공개되는 환경변수(NEXT_PUBLIC_*)만 검증한다. 서버 키는 절대 여기에 넣지 않는다.
// zod/mini를 쓰는 이유: 이 파일은 브라우저 번들에 들어가므로 번들 크기를 줄이기 위함 (T0.27).
import * as z from "zod/mini";
import {
  CLIENT_ENV_KEYS,
  EnvValidationError,
  cleanEnv,
  findMissingRequired,
  type ClientEnvKey,
  type EnvProblem,
  type RuntimeInfo,
} from "./keys";

const optionalUrl = (name: string) =>
  z.optional(
    z.url({ error: `${name}: http(s)로 시작하는 올바른 URL이어야 합니다.` }),
  );
const optionalString = z.optional(z.string());
// "true"/"false" 문자열을 boolean으로 변환. 미설정이면 false.
const flag = z.pipe(
  z.optional(
    z.enum(["true", "false"], { error: '"true" 또는 "false"만 허용됩니다.' }),
  ),
  z.transform((v) => v === "true"),
);

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl("NEXT_PUBLIC_SITE_URL"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  NEXT_PUBLIC_KAKAO_JS_KEY: optionalString,
  NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: optionalString,
  NEXT_PUBLIC_POSTHOG_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl("NEXT_PUBLIC_POSTHOG_HOST"),
  NEXT_PUBLIC_DESIGN_LAB: flag,
});

export type ClientEnv = z.output<typeof clientSchema>;

/** 순수 함수: 주어진 값을 검증한다(테스트용으로 분리). 실패 시 EnvValidationError. */
export function parseClientEnv(
  source: Partial<Record<ClientEnvKey, string | undefined>>,
  info: RuntimeInfo,
  options: { checkRequired?: boolean } = {},
): ClientEnv {
  const cleaned = cleanEnv(
    Object.fromEntries(CLIENT_ENV_KEYS.map((k) => [k, source[k]])) as Record<
      ClientEnvKey,
      string | undefined
    >,
  );
  const problems: EnvProblem[] =
    options.checkRequired === false
      ? []
      : findMissingRequired(cleaned, CLIENT_ENV_KEYS, info);

  const result = z.safeParse(clientSchema, cleaned);
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push({
        key: String(issue.path[0] ?? "(알 수 없음)"),
        message: issue.message,
      });
    }
  }
  if (problems.length > 0 || !result.success)
    throw new EnvValidationError("클라이언트", problems);
  return result.data;
}

let cached: ClientEnv | undefined;

/** 검증된 클라이언트 환경변수. 첫 호출 때 검증하고 캐시한다. */
export function clientEnv(): ClientEnv {
  if (cached) return cached;
  // 주의: Next가 빌드 시 문자열로 치환하려면 process.env.NEXT_PUBLIC_X 를 하나씩 정적으로 참조해야 한다.
  // process.env 전체나 동적 키 접근은 브라우저에서 비어 있다.
  const raw = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
    NEXT_PUBLIC_NAVER_MAP_CLIENT_ID:
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_DESIGN_LAB: process.env.NEXT_PUBLIC_DESIGN_LAB,
  };
  // 브라우저에서는 VERCEL_ENV, NEXT_PHASE를 알 수 없으므로 필수 검사는 서버 시작 시(instrumentation)에 맡긴다.
  const inBrowser = typeof window !== "undefined";
  cached = parseClientEnv(
    raw,
    {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PHASE: process.env.NEXT_PHASE,
    },
    { checkRequired: !inBrowser },
  );
  return cached;
}

/** 테스트 전용: 캐시 초기화 */
export function resetClientEnvCache(): void {
  cached = undefined;
}
