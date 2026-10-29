// 홈 시안 비교 옵션 (T3.2): 배지 색 체계와 카드 세트. 시안 화면 계약(HomeVariantProps)은 그대로 두고 문맥으로 내려 준다.
// 쿼리: ?badges=current|calm  ?deck=today|overflow (단독 화면과 비교 스위처 공통, 기본값은 생략)
// 서버 라우트에서도 읽으므로 React 의존 없는 순수 모듈로 둔다. 문맥은 lab-options-context.tsx.

/**
 * 배지 색 체계 (D-04 안건).
 * - current: 지금 공용 배지(T2.9). 의미 색 3가지(warning 주황, info 파랑, success 초록)를 테두리와 글자에 쓴다.
 * - calm: 기피 경고만 warning, 나머지(웨이팅, 할인)는 중립 선과 글자 + 아이콘. 추정 표시도 중립 글자.
 */
export const BADGE_PALETTES = ["current", "calm"] as const;
export type BadgePalette = (typeof BADGE_PALETTES)[number];

/** 카드 세트. overflow는 후보 배지가 3개 이상 겹치는 MOCK_HOME_BADGE_OVERFLOW에서 시작한다 */
export const HOME_DECKS = ["today", "overflow"] as const;
export type HomeDeck = (typeof HOME_DECKS)[number];

export type HomeLabOptions = {
  badges: BadgePalette;
  deck: HomeDeck;
};

export const HOME_LAB_DEFAULTS: HomeLabOptions = {
  badges: "current",
  deck: "today",
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
      BADGE_PALETTES,
      read(params, "badges"),
      HOME_LAB_DEFAULTS.badges,
    ),
    deck: pick(HOME_DECKS, read(params, "deck"), HOME_LAB_DEFAULTS.deck),
  };
}

/** 기본값이 아닌 옵션만 쿼리에 남긴다 */
export function writeHomeLabOptions(
  params: URLSearchParams,
  options: HomeLabOptions,
): void {
  if (options.badges !== HOME_LAB_DEFAULTS.badges)
    params.set("badges", options.badges);
  if (options.deck !== HOME_LAB_DEFAULTS.deck) params.set("deck", options.deck);
}
