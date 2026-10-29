// 홈 D1 확인 옵션 (T3.2, G3 D-05). 화면 계약(HomeD1Props)은 그대로 두고 문맥으로 내려 준다.
// 쿼리: ?deck=today|overflow  ?seed=<정수>  ?feedback=none (기본값은 생략)
// - deck=overflow: 후보 배지가 3개 이상 겹치는 MOCK_HOME_BADGE_OVERFLOW에서 시작(배지 우선순위 확인).
// - seed: 그냥 골라줘 난수 시드(캡처 재현용). 없으면 Math.random.
// - feedback=none: 어제 피드백을 물을 것이 없는 날(FB-04: 하루 1회, 48시간 지난 방문은 묻지 않음).
// T3.2, T3.3 비교 옵션 ?badges=, ?roulette=는 G3에서 calm, R1로 정해져 T3.8에서 지웠다.
// 서버 라우트에서도 읽으므로 React 의존 없는 순수 모듈로 둔다. 문맥은 lab-options-context.tsx.

/** 어제 피드백 (FB-01). ask: 물을 곳이 있음, none: 없음 */
export const FEEDBACK_CHOICES = ["ask", "none"] as const;
export type FeedbackChoice = (typeof FEEDBACK_CHOICES)[number];

/** 카드 세트. overflow는 후보 배지가 3개 이상 겹치는 MOCK_HOME_BADGE_OVERFLOW에서 시작한다 */
export const HOME_DECKS = ["today", "overflow"] as const;
export type HomeDeck = (typeof HOME_DECKS)[number];

export type HomeLabOptions = {
  deck: HomeDeck;
  /** 고르기 난수 시드. null이면 Math.random(캡처 재현용으로만 쓴다) */
  seed: number | null;
  feedback: FeedbackChoice;
};

export const HOME_LAB_DEFAULTS: HomeLabOptions = {
  deck: "today",
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
    deck: pick(HOME_DECKS, read(params, "deck"), HOME_LAB_DEFAULTS.deck),
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
