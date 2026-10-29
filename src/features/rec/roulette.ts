/**
 * "그냥 골라줘" 연출 규칙 (REC-12). 결과는 pickByScore(src/lib/reco/pick-one.ts)가 먼저 정하고,
 * 여기서는 그 결과에 닿는 연출의 순서와 시간만 계산한다. React, DOM에 의존하지 않는 순수 함수다.
 *
 * R1 하이라이트 순회(G3 선택, design-decisions D-05): 강조가 화면의 카드 사이를 점점 느리게 옮겨 다니다
 * 고른 곳에서 멈춘다. T3.3에서 비교한 R2 이름 롤링, R3 조용한 확정은 고르지 않아 T3.8에서 지웠다.
 *
 * 시간 예산: 누른 뒤 결과 카드가 다 보일 때까지 2초 이내(10초 원칙). 결과 카드 등장(slow 300ms)을 포함한다.
 * 감속 곡선은 오버슈트가 없다(DESIGN.md 7장 "멈출 때 튀지 않습니다").
 */

/** 결과 카드가 다 보이기까지(ms): 순회가 멈춘 뒤 결과 패널이 한 번에 페이드로 나타난다(slow 300ms) */
export const RESULT_REVEAL_MS = 300;
/** 전체 상한(ms): 누름부터 결과가 다 보일 때까지 */
export const ROULETTE_BUDGET_MS = 2000;

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

/** 결과가 보이기 시작하는 시각(ms): 마지막 칸 + 머묾 */
export function highlightSettleMs(steps: readonly HighlightStep[]): number {
  const last = steps[steps.length - 1];
  return (last?.atMs ?? 0) + HIGHLIGHT.holdMs;
}
