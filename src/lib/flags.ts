// 기능 플래그 레지스트리 (T0.25). 플래그 판정의 단일 진입점은 isEnabled(key) 입니다.
// 미완성 기능은 플래그로 숨긴 채 푸시한다 (CLAUDE.md 11장).
//
// 규칙
// - 플래그는 아래 FLAGS 에만 추가한다. 키 이름은 camelCase, 기본값은 false.
// - source.type "env": 검증된 클라이언트 env(NEXT_PUBLIC_*)를 읽는다. 빌드 시 값이 인라인된다.
// - source.type "const": 코드 상수. 해제할 때 소유 작업(owner)에서 값을 바꾸거나 플래그를 지운다.
// - productionOff: Vercel Production(VERCEL_ENV=production)에서는 env 값과 무관하게 항상 꺼진다.
//   VERCEL_ENV 는 서버 전용이므로 이 판정은 서버에서만 유효하다. 브라우저에서는 productionOff 플래그를 항상 끈다
//   (클라이언트 번들이 값을 알 수 없으므로 안전한 쪽으로 닫는다). 필요한 UI는 서버에서 판정해 props 로 내려준다.
// - 나중에 PostHog 원격 플래그를 붙이려면 evaluateFlag 의 입력(FlagContext)에 원격 값을 추가하면 된다.
import { clientEnv, type ClientEnv } from "./env/client";

type EnvFlagKey = {
  [K in keyof ClientEnv]-?: ClientEnv[K] extends boolean ? K : never;
}[keyof ClientEnv];

export type FlagSource =
  { type: "env"; key: EnvFlagKey } | { type: "const"; value: boolean };

export type FlagDefinition = {
  description: string;
  /** 소스 값이 없을 때의 기본값 */
  default: boolean;
  source: FlagSource;
  /** 이 플래그를 만들고 해제할 작업 ID (docs/tasks.md) */
  owner: string;
  /** true 면 Vercel Production 에서 항상 꺼진다 */
  productionOff?: boolean;
};

export const FLAGS = {
  designLab: {
    description: "/design-lab 시안 페이지 노출. 프로덕션에서는 항상 꺼짐.",
    default: false,
    source: { type: "env", key: "NEXT_PUBLIC_DESIGN_LAB" },
    owner: "T0.25",
    productionOff: true,
  },
  appShell: {
    description:
      "로그인 후 앱 화면(오늘, 지도, 투표, 나) 묶음. 탭 화면이 자리 표시만 있는 동안 프로덕션에서 숨김.",
    default: false,
    source: { type: "const", value: true },
    owner: "T2.6 (해제: 오늘 탭 실제 화면 T5)",
    productionOff: true,
  },
  auth: {
    description:
      "로그인 묶음: /login(인앱 안내 포함), /auth/sign-in, /auth/callback, /auth/sign-out, /auth/delete-account, 약관 동의 /welcome/terms, 온보딩 /welcome/onboarding(T4.16), 약관 초안 /terms와 /privacy, 계정 /me/account, proxy의 경로 보호와 약관 확인. 약관 최종 전문과 실기기 확인(T4.14) 전까지 프로덕션에서 숨김.",
    default: false,
    source: { type: "const", value: true },
    owner: "T4.6 (해제: T4.11, T4.12 완료 후)",
    productionOff: true,
  },
  pollEntry: {
    description: "홈과 상세의 투표 관련 진입점 (친구랑 정하기, 회식 모드 등).",
    default: false,
    source: { type: "const", value: false },
    owner: "T5.20, T5.23 (해제 T7.35)",
  },
  betaFeedback: {
    description: "나 탭의 베타 전용 피드백 버튼.",
    default: false,
    source: { type: "const", value: false },
    owner: "T9.4",
  },
  userPlaceMemo: {
    description:
      "사용자가 직접 쓰는 장소 메모 저장. 카카오 답변 전까지 숨김 (T0.16). 메모 컬럼은 T5.14에서 만들지 않았고 T10.2 답변 뒤 새 마이그레이션으로 추가한다.",
    default: false,
    source: { type: "const", value: false },
    owner: "T10.2",
  },
} as const satisfies Record<string, FlagDefinition>;

export type FlagKey = keyof typeof FLAGS;

/** 판정에 쓰는 실행 환경 값. 테스트에서 주입할 수 있도록 분리했다. */
export type FlagContext = {
  /** 소스 값(env 플래그의 boolean). 없으면 default */
  envValues: Partial<Record<EnvFlagKey, boolean>>;
  /** process.env.VERCEL_ENV. 브라우저에서는 undefined */
  vercelEnv: string | undefined;
  /** 브라우저에서 실행 중인지 */
  inBrowser: boolean;
};

/** 순수 함수: 정의와 환경으로 플래그 값을 계산한다. */
export function evaluateFlag(def: FlagDefinition, ctx: FlagContext): boolean {
  if (def.productionOff && (ctx.inBrowser || ctx.vercelEnv === "production")) {
    return false;
  }
  const value =
    def.source.type === "const"
      ? def.source.value
      : ctx.envValues[def.source.key];
  return value ?? def.default;
}

/** 플래그 단일 진입점. 서버 컴포넌트, 라우트 핸들러에서 호출한다. */
export function isEnabled(key: FlagKey): boolean {
  const def: FlagDefinition = FLAGS[key];
  const inBrowser = typeof window !== "undefined";
  const envValues: FlagContext["envValues"] =
    def.source.type === "env"
      ? { [def.source.key]: clientEnv()[def.source.key] }
      : {};
  return evaluateFlag(def, {
    envValues,
    vercelEnv: process.env.VERCEL_ENV,
    inBrowser,
  });
}
