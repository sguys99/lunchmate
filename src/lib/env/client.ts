// 클라이언트에 공개되는 환경변수(NEXT_PUBLIC_*)만 검증한다. 서버 키는 절대 여기에 넣지 않는다.
// 이 파일은 (app) 레이아웃의 분석 Provider를 거쳐 홈 첫 번들에 들어간다. zod/mini도 core 묶음이 약 16KB gzip이라
// 검사 몇 개(URL, true/false)는 직접 쓴다 (T2.22). 서버 env 검증(server.ts)은 그대로 zod를 쓴다.
import {
  CLIENT_ENV_KEYS,
  EnvValidationError,
  cleanEnv,
  resolveSiteUrl,
  findMissingRequired,
  type ClientEnvKey,
  type EnvProblem,
  type RuntimeInfo,
} from "./keys";

/** URL 형식이어야 하는 키. 값이 있으면 http(s) URL이어야 한다. */
const URL_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const satisfies readonly ClientEnvKey[];

/** "true"/"false" 문자열을 boolean으로 바꾸는 키. 미설정이면 false. */
const FLAG_KEYS = [
  "NEXT_PUBLIC_DESIGN_LAB",
] as const satisfies readonly ClientEnvKey[];

type FlagKey = (typeof FLAG_KEYS)[number];

export type ClientEnv = {
  [K in Exclude<ClientEnvKey, FlagKey>]?: string;
} & { [K in FlagKey]: boolean };

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** 순수 함수: 주어진 값을 검증한다(테스트용으로 분리). 실패 시 EnvValidationError. 오류 메시지에 값은 넣지 않는다. */
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
  // SITE_URL이 없으면 Vercel 프로덕션 URL로 대체한 뒤 필수 검사와 URL 검증을 한다.
  cleaned.NEXT_PUBLIC_SITE_URL = resolveSiteUrl(cleaned);
  const problems: EnvProblem[] =
    options.checkRequired === false
      ? []
      : findMissingRequired(cleaned, CLIENT_ENV_KEYS, info);

  for (const key of URL_KEYS) {
    const value = cleaned[key];
    if (value !== undefined && !isHttpUrl(value))
      problems.push({
        key,
        message: `${key}: http(s)로 시작하는 올바른 URL이어야 합니다.`,
      });
  }
  const flags = {} as Record<FlagKey, boolean>;
  for (const key of FLAG_KEYS) {
    const value = cleaned[key];
    if (value !== undefined && value !== "true" && value !== "false")
      problems.push({ key, message: '"true" 또는 "false"만 허용됩니다.' });
    flags[key] = value === "true";
  }

  if (problems.length > 0) throw new EnvValidationError("클라이언트", problems);
  return { ...cleaned, ...flags };
}

let cached: ClientEnv | undefined;

/** 검증된 클라이언트 환경변수. 첫 호출 때 검증하고 캐시한다. */
export function clientEnv(): ClientEnv {
  if (cached) return cached;
  // 주의: Next가 빌드 시 문자열로 치환하려면 process.env.NEXT_PUBLIC_X 를 하나씩 정적으로 참조해야 한다.
  // process.env 전체나 동적 키 접근은 브라우저에서 비어 있다.
  const raw = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
    NEXT_PUBLIC_NAVER_MAP_CLIENT_ID:
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
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
