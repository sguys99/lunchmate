// 환경변수 키 목록과 필수 여부 규칙. 의존성이 없는 순수 파일이라
// 서버, 클라이언트, 검사 스크립트(scripts/check-client-secrets.mjs)가 함께 가져다 쓴다.
// 키를 추가할 때는 .env.example, CLAUDE.md 12장도 함께 갱신한다.

/** 서버 전용 키. 어떤 경우에도 브라우저 번들에 들어가면 안 된다. */
export const SERVER_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
  "NAVER_LOGIN_CLIENT_ID",
  "NAVER_LOGIN_CLIENT_SECRET",
] as const;

/**
 * 이름은 서버 전용이지만 값 자체는 공개 정보인 키. 유출 검사에서 값 비교만 건너뛴다(이름 검사는 유지).
 * SUPABASE_PROJECT_REF는 NEXT_PUBLIC_SUPABASE_URL(https://<ref>.supabase.co)에 이미 들어 있다.
 */
export const PUBLIC_VALUE_SERVER_KEYS: readonly (typeof SERVER_ENV_KEYS)[number][] =
  ["SUPABASE_PROJECT_REF"];

/** 브라우저에 공개되는 키. NEXT_PUBLIC_ 접두사만 허용한다. */
export const CLIENT_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  // Vercel 시스템 변수(Production 도메인, 프로토콜 없음). SITE_URL이 없을 때의 폴백
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_KAKAO_JS_KEY",
  "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  // Sentry DSN은 브라우저에도 노출되는 공개 값이므로 서버와 클라이언트가 이 키 하나를 함께 쓴다 (T0.35)
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_DESIGN_LAB",
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];
export type ClientEnvKey = (typeof CLIENT_ENV_KEYS)[number];

/**
 * 프로덕션에서 반드시 있어야 하는 키.
 * 지금은 최소로 둔다. T0.13 이후(Supabase 연결, 카카오, 네이버 키 발급 완료) 아래 주석 키를 필수로 전환한다.
 */
export const PRODUCTION_REQUIRED_KEYS: readonly (
  ServerEnvKey | ClientEnvKey
)[] = [
  // NEXT_PUBLIC_SITE_URL은 Vercel 프로덕션 URL로 대체 가능(resolveSiteUrl). 판정은 폴백 적용 후 값으로 한다.
  "NEXT_PUBLIC_SITE_URL",
  // T0.13 이후 필수 전환:
  // "NEXT_PUBLIC_SUPABASE_URL",
  // "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  // "SUPABASE_SERVICE_ROLE_KEY",
  // "NEXT_PUBLIC_KAKAO_JS_KEY",
  // "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID",
  // "NEXT_PUBLIC_POSTHOG_KEY",
  // "NEXT_PUBLIC_POSTHOG_HOST",
];

/**
 * 사이트 URL 폴백: NEXT_PUBLIC_SITE_URL → https://NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL.
 * 둘 다 없으면 undefined(개발은 siteUrl()이 localhost로, 프로덕션은 필수 검사가 오류로 처리).
 * Vercel 값은 프로토콜이 없는 호스트이므로 https://를 붙인다.
 */
export function resolveSiteUrl(
  cleaned: Record<string, string | undefined>,
): string | undefined {
  const explicit = cleaned.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const host = cleaned.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) return undefined;
  return /^https?:\/\//i.test(host) ? host : `https://${host}`;
}

export type RuntimeInfo = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  NEXT_PHASE?: string;
};

/**
 * 필수 키 검사를 적용할 환경인지 판정한다.
 * `next build`는 로컬에서도 NODE_ENV=production 이므로, 빌드 단계는 VERCEL_ENV=production 일 때만 검사한다.
 * (일반 프로덕션 서버 실행 시점에는 항상 검사)
 */
export function isProductionRequired(info: RuntimeInfo): boolean {
  if (info.VERCEL_ENV === "production") return true;
  return (
    info.NODE_ENV === "production" &&
    info.NEXT_PHASE !== "phase-production-build"
  );
}

export type EnvProblem = { key: string; message: string };

/** 빈 문자열("KEY=")은 미설정으로 본다. */
export function cleanEnv<K extends string>(
  raw: Record<K, string | undefined>,
): Record<K, string | undefined> {
  const out = {} as Record<K, string | undefined>;
  for (const k of Object.keys(raw) as K[]) {
    const v = raw[k]?.trim();
    out[k] = v === "" ? undefined : v;
  }
  return out;
}

/** 필수 키 중 이 범위(keys)에 속하는데 비어 있는 것을 오류로 돌려준다. */
export function findMissingRequired(
  cleaned: Record<string, string | undefined>,
  scope: readonly string[],
  info: RuntimeInfo,
): EnvProblem[] {
  if (!isProductionRequired(info)) return [];
  return PRODUCTION_REQUIRED_KEYS.filter(
    (k) => scope.includes(k) && cleaned[k] === undefined,
  ).map((key) => ({
    key,
    message: "프로덕션에서는 필수 값입니다. 설정되어 있지 않습니다.",
  }));
}

export class EnvValidationError extends Error {
  readonly problems: EnvProblem[];
  constructor(scope: string, problems: EnvProblem[]) {
    // 값은 절대 메시지에 포함하지 않는다. 키 이름과 이유만 알린다.
    const lines = problems.map((p) => `  - ${p.key}: ${p.message}`).join("\n");
    super(
      `${scope} 환경변수 검증에 실패했습니다. .env.local과 배포 환경 설정을 확인하세요.\n${lines}`,
    );
    this.name = "EnvValidationError";
    this.problems = problems;
  }
}
