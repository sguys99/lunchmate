/**
 * "그냥 골라줘" 연출 규칙 (REC-12, T3.3 시안). 결과는 pickByScore(src/lib/reco/pick-one.ts)가 먼저 정하고,
 * 여기서는 그 결과에 닿는 연출의 순서와 시간만 계산한다. React, DOM에 의존하지 않는 순수 함수다.
 *
 * 세 안(design-lab 비교용, G3에서 하나를 고른다)
 * - r1 하이라이트 순회: 강조가 카드 사이를 점점 느리게 옮겨 다니다 고른 곳에서 멈춘다.
 * - r2 이름 롤링: 식당 이름 줄이 세로로 감속하며 흐르다 고른 이름에서 멈춘다.
 * - r3 조용한 확정: 짧게 고르는 표시(가는 선이 차오름) 뒤 결과가 나타난다.
 *
 * 공통 시간 예산: 누른 뒤 결과가 다 보일 때까지 2초 이내(10초 원칙). 결과 등장(slow 300ms)을 포함한다.
 * 감속 곡선은 오버슈트가 없다(DESIGN.md 7장 "멈출 때 튀지 않습니다").
 */

export const ROULETTE_MODES = ["r1", "r2", "r3"] as const;
export type RouletteMode = (typeof ROULETTE_MODES)[number];

export function isRouletteMode(value: unknown): value is RouletteMode {
  return (ROULETTE_MODES as readonly unknown[]).includes(value);
}

/** 결과 카드 등장: 연출 무대가 먼저 흐려지도록 기다리는 시간(ms) */
export const RESULT_OFFSET_MS = 120;
/** 결과 카드 블록 순차 등장의 마지막 순번(세리프 한 줄 0, 이름 1, 이유 2, 숫자와 버튼 3) */
export const RESULT_LAST_STEP = 3;
/** 결과 카드가 다 보이기까지(ms): 대기 + 마지막 블록 지연(stagger 70ms) + 페이드(slow 300ms) */
export const RESULT_REVEAL_MS = RESULT_OFFSET_MS + RESULT_LAST_STEP * 70 + 300;
/** 전체 상한(ms): 누름부터 결과가 다 보일 때까지 */
export const ROULETTE_BUDGET_MS = 2000;

/* ---------- r1 하이라이트 순회 ---------- */

export const HIGHLIGHT = {
  /** 첫 칸 사이 간격(ms) */
  firstGapMs: 60,
  /** 마지막 칸 사이 간격(ms) */
  lastGapMs: 260,
  /** 최소 바퀴 수. 3곳이면 6칸 + 목표까지의 거리 */
  minLaps: 2,
  /** 멈춘 뒤 나머지가 물러나기 전 머무는 시간(ms) */
  holdMs: 200,
} as const;

export type HighlightStep = {
  /** 강조할 카드 번호 */
  index: number;
  /** 시작부터 이 칸으로 옮길 시각(ms) */
  atMs: number;
};

/**
 * 강조가 옮겨 다닐 순서와 시각. 첫 칸은 start(0ms), 마지막 칸은 항상 target이다.
 * 간격은 firstGapMs에서 lastGapMs로 이차 곡선(ease-out 느낌)으로 늘어난다.
 */
export function highlightSchedule(
  count: number,
  target: number,
  start = 0,
): HighlightStep[] {
  if (count <= 0 || target < 0 || target >= count) return [];
  if (count === 1) return [{ index: 0, atMs: 0 }];
  const distance = (((target - start) % count) + count) % count;
  const hops = HIGHLIGHT.minLaps * count + distance;
  const steps: HighlightStep[] = [{ index: start % count, atMs: 0 }];
  let at = 0;
  for (let k = 1; k <= hops; k++) {
    const t = k / hops;
    at +=
      HIGHLIGHT.firstGapMs +
      (HIGHLIGHT.lastGapMs - HIGHLIGHT.firstGapMs) * t * t;
    steps.push({ index: (start + k) % count, atMs: Math.round(at) });
  }
  return steps;
}

/** r1에서 결과가 보이기 시작하는 시각(ms): 마지막 칸 + 머묾 */
export function highlightSettleMs(steps: readonly HighlightStep[]): number {
  const last = steps[steps.length - 1];
  return (last?.atMs ?? 0) + HIGHLIGHT.holdMs;
}

/* ---------- r2 이름 롤링 ---------- */

export const ROLL = {
  /** 이름 줄이 흐르는 시간(ms). CSS transition 하나로 감속한다 */
  durationMs: 1200,
  /** 이름 목록을 몇 번 반복해 흘릴지 */
  laps: 2,
  /** 감속 곡선. 끝이 길게 늘어지고 넘침이 없다(y 값 0~1) */
  easing: "cubic-bezier(0.12, 0.72, 0.16, 1)",
  /** 멈춘 뒤 축하 문장이 나타나기 전 머무는 시간(ms) */
  holdMs: 100,
} as const;

/**
 * 롤링 띠: 보여 줄 이름 번호 목록과 멈출 칸. 띠는 laps바퀴 + 목표까지, 멈춤 칸은 띠의 마지막이다.
 * 첫 칸은 start(지금 보고 있는 카드)라 누르는 순간 화면이 튀지 않는다.
 */
export function rollingStrip(
  count: number,
  target: number,
  start = 0,
): { order: number[]; stopAt: number } {
  if (count <= 0 || target < 0 || target >= count)
    return { order: [], stopAt: 0 };
  const distance = (((target - start) % count) + count) % count;
  const length = ROLL.laps * count + distance + 1;
  const order = Array.from({ length }, (_, k) => (start + k) % count);
  return { order, stopAt: length - 1 };
}

/* ---------- r3 조용한 확정 ---------- */

export const QUIET = {
  /** 고르는 표시(가는 선이 차오름) 시간(ms) */
  thinkMs: 600,
} as const;

/* ---------- 공통 ---------- */

/** 안별로 결과가 보이기 시작하는 시각(ms). r1은 목표에 따라 달라 schedule을 받는다 */
export function settleMs(
  mode: RouletteMode,
  steps: readonly HighlightStep[] = [],
): number {
  switch (mode) {
    case "r1":
      return highlightSettleMs(steps);
    case "r2":
      return ROLL.durationMs + ROLL.holdMs;
    case "r3":
      return QUIET.thinkMs;
  }
}
