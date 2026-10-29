// 홈 시안 비교 옵션 (T3.2): 배지 색 체계와 카드 세트. 시안 화면 계약(HomeVariantProps)은 그대로 두고 문맥으로 내려 준다.
// 쿼리: ?badges=current|calm  ?deck=today|overflow  ?roulette=r1|r2|r3  ?seed=<정수>  ?feedback=none
// (단독 화면과 비교 스위처 공통, 기본값은 생략)
// badges를 생략하면 시안별 기본값: A~D는 current, 수정 시안 D1~D3은 G3 안건 1 추천안 calm(resolveBadgePalette).
// feedback=none은 어제 피드백을 물을 것이 없는 날(FB-04: 하루 1회, 48시간 지난 방문은 묻지 않음).
// roulette, seed는 T3.3 "그냥 골라줘" 비교 옵션. roulette을 생략하면 시안별 기본값(just-pick.ts DEFAULT_ROULETTE)을 쓴다.
// 서버 라우트에서도 읽으므로 React 의존 없는 순수 모듈로 둔다. 문맥은 lab-options-context.tsx.

/**
 * 배지 색 체계 (D-04 안건).
 * - current: 지금 공용 배지(T2.9). 의미 색 3가지(warning 주황, info 파랑, success 초록)를 테두리와 글자에 쓴다.
 * - calm: 기피 경고만 warning, 나머지(웨이팅, 할인)는 중립 선과 글자 + 아이콘. 추정 표시도 중립 글자.
 */
export const BADGE_PALETTES = ["current", "calm"] as const;
export type BadgePalette = (typeof BADGE_PALETTES)[number];
/** 비교 토글 값. auto는 시안별 기본값 */
export const BADGE_CHOICES = ["auto", ...BADGE_PALETTES] as const;
export type BadgeChoice = (typeof BADGE_CHOICES)[number];

/** auto를 실제 체계로. 시안이 기본값을 덮어쓰지 않으면 current(T3.2 대조군) */
export function resolveBadgePalette(
  choice: BadgeChoice,
  fallback: BadgePalette = "current",
): BadgePalette {
  return choice === "auto" ? fallback : choice;
}

/** 어제 피드백 (FB-01). ask: 물을 곳이 있음, none: 없음 */
export const FEEDBACK_CHOICES = ["ask", "none"] as const;
export type FeedbackChoice = (typeof FEEDBACK_CHOICES)[number];

/** 카드 세트. overflow는 후보 배지가 3개 이상 겹치는 MOCK_HOME_BADGE_OVERFLOW에서 시작한다 */
export const HOME_DECKS = ["today", "overflow"] as const;
export type HomeDeck = (typeof HOME_DECKS)[number];

/** "그냥 골라줘" 연출 (T3.3). auto는 시안별 기본값. r1~r3의 뜻은 src/features/rec/roulette.ts */
export const ROULETTE_CHOICES = ["auto", "r1", "r2", "r3"] as const;
export type RouletteChoice = (typeof ROULETTE_CHOICES)[number];

export type HomeLabOptions = {
  badges: BadgeChoice;
  deck: HomeDeck;
  roulette: RouletteChoice;
  /** 고르기 난수 시드. null이면 Math.random(캡처 재현용으로만 쓴다) */
  seed: number | null;
  feedback: FeedbackChoice;
};

export const HOME_LAB_DEFAULTS: HomeLabOptions = {
  badges: "auto",
  deck: "today",
  roulette: "auto",
  seed: null,
  feedback: "ask",
};

type Params =
  | URLSearchParams
  | Readonly<Record<string, string | readonly string[] | undefined>>;

function read(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const raw = params[key];
  return typeof raw === "string" ? raw : raw?.[0];
}

function pick<T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  const v = value?.trim().toLowerCase();
  return v !== undefined && (options as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

export function parseHomeLabOptions(params: Params): HomeLabOptions {
  return {
    badges: pick(
      BADGE_CHOICES,
      read(params, "badges"),
      HOME_LAB_DEFAULTS.badges,
    ),
    deck: pick(HOME_DECKS, read(params, "deck"), HOME_LAB_DEFAULTS.deck),
    roulette: pick(
      ROULETTE_CHOICES,
      read(params, "roulette"),
      HOME_LAB_DEFAULTS.roulette,
    ),
    seed: parseSeed(read(params, "seed")),
    feedback: pick(
      FEEDBACK_CHOICES,
      read(params, "feedback"),
      HOME_LAB_DEFAULTS.feedback,
    ),
  };
}

function parseSeed(value: string | undefined): number | null {
  if (value === undefined || !/^\d{1,9}$/.test(value.trim())) return null;
  return Number.parseInt(value, 10);
}

/** 기본값이 아닌 옵션만 쿼리에 남긴다 */
export function writeHomeLabOptions(
  params: URLSearchParams,
  options: HomeLabOptions,
): void {
  if (options.badges !== HOME_LAB_DEFAULTS.badges)
    params.set("badges", options.badges);
  if (options.deck !== HOME_LAB_DEFAULTS.deck) params.set("deck", options.deck);
  if (options.roulette !== HOME_LAB_DEFAULTS.roulette)
    params.set("roulette", options.roulette);
  if (options.seed !== null) params.set("seed", String(options.seed));
  if (options.feedback !== HOME_LAB_DEFAULTS.feedback)
    params.set("feedback", options.feedback);
}
