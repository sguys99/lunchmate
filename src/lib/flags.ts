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
      "앱 화면(오늘, 지도, 투표, 나) 묶음. 2026-10-31 프로덕션에서도 켬(사용자 결정, 5단계 마무리): 오늘과 지도는 비로그인 둘러보기(AUTH-07, T4.8)로 열린다. 나와 로그인 경로는 auth 플래그가 따로 막는다.",
    default: false,
    source: { type: "const", value: true },
    owner: "T2.6 (해제: 2026-10-31 5단계 마무리, productionOff 제거)",
  },
  auth: {
    description:
      "로그인 묶음: /login(인앱 안내 포함), /auth/sign-in, /auth/callback, /auth/sign-out, /auth/delete-account, 약관 동의 /welcome/terms, 온보딩 /welcome/onboarding(T4.16), 약관 3종 /terms, /privacy, /location(T10.3 최종본), 계정 /me/account, proxy의 경로 보호와 약관 확인. 2026-11-02 T9.2에서 프로덕션에도 공개(D-22, 주소는 lunchmate-kr.vercel.app 유지). 끄면 나 탭과 로그인 유도가 \"곧 열립니다\" 안내로 돌아간다.",
    default: false,
    source: { type: "const", value: true },
    owner:
      "T4.6 (해제: 2026-11-02 T9.2, pollEntry, adminConsole, betaFeedback과 함께 productionOff 제거)",
  },
  pollEntry: {
    description:
      "홈과 상세의 투표 관련 진입점과 투표 화면 (친구랑 정하기, 회식 모드, 투표에 추가, 투표 탭, 투표방). 2026-11-01 T7.35에서 개발과 Preview는 켬, 2026-11-02 T9.2에서 auth와 함께 프로덕션에도 공개(D-22). 서버에서 판정해 props로 내려준다.",
    default: false,
    source: { type: "const", value: true },
    owner: "T5.20, T5.23 (해제 T7.35, 프로덕션 2026-11-02 T9.2)",
  },
  adminConsole: {
    description:
      "관리자 화면 /admin (MOD-06, T8.5). 마이그레이션 20261101180000(admin_* 함수) 적용 전에는 목록이 오류 상태로 보인다. 2026-11-02 T9.2에서 로그인 묶음과 함께 프로덕션에 공개(D-22). 관리자 role 확인은 레이아웃과 DB 함수가 따로 하므로 관리자가 아니면 들어올 수 없다.",
    default: false,
    source: { type: "const", value: true },
    owner: "T8.5 (해제: 2026-11-02 T9.2)",
  },
  betaFeedback: {
    description:
      "나 탭 머리 아래의 베타 의견 보내기 줄과 시트(T9.4, D-23). 마이그레이션 20261102120000(beta_feedback) 적용 전에는 보내기가 실패 안내로 끝난다. 로그인 사용자에게만 보인다. 2026-11-02 T9.2에서 auth와 함께 프로덕션에 공개(D-22). 베타가 끝나면(T9.13) 값을 false로. 서버에서 판정해 props로 내려준다.",
    default: false,
    source: { type: "const", value: true },
    owner: "T9.4 (해제: 2026-11-02 T9.2, 끄기: T9.13 베타 종료)",
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
