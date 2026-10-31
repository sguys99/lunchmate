// 다시 뽑기 3연속 약한 부정 (T6.11, PRD 7장 "다시 뽑기 3연속 → 약한 부정"). 순수 함수.
//
// - 다시 뽑기를 누를 때마다, 그때 화면에 있던 카테고리의 연속 횟수를 1 올리고 화면에 없던 카테고리는 0으로 돌린다.
// - 연속 RESHUFFLE_STREAK(3)번이 되면 그 카테고리를 이번 세션 약한 부정(sessionDisliked)에 넣고 횟수를 0으로 돌린다.
// - 다시 뽑기가 아닌 새 묶음(끼니, 기준 위치, 도보 분 바꾸기)은 연속을 끊는다(resetRerollStreaks.
//   홈은 첫 로드 번들을 줄이려고 같은 규칙을 today-store.ts redraw에 직접 둔다).
// - 세션 메모리 값이다(Zustand, persist 없음). 저장, 서버, 분석 이벤트로 보내지 않는다.
import type { CategorySlug } from "@/features/place/categories";
import { RESHUFFLE_STREAK } from "./constants";

export type RerollStreaks = Readonly<Partial<Record<CategorySlug, number>>>;

export type RerollSignal = {
  streaks: RerollStreaks;
  disliked: ReadonlySet<CategorySlug>;
};

export const EMPTY_REROLL_SIGNAL: RerollSignal = {
  streaks: {},
  disliked: new Set(),
};

/** 다시 뽑기 한 번. shown은 누를 때 화면에 있던 카드의 카테고리(중복 가능) */
export function noteReroll(
  prev: RerollSignal,
  shown: readonly CategorySlug[],
): RerollSignal {
  const streaks: Partial<Record<CategorySlug, number>> = {};
  let disliked = prev.disliked;
  for (const cat of new Set(shown)) {
    const n = (prev.streaks[cat] ?? 0) + 1;
    if (n >= RESHUFFLE_STREAK) {
      if (!disliked.has(cat)) disliked = new Set([...disliked, cat]);
    } else {
      streaks[cat] = n;
    }
  }
  return { streaks, disliked };
}

/** 다시 뽑기가 아닌 새 묶음: 연속만 끊고 이미 정한 약한 부정은 세션 동안 둔다 */
export function resetRerollStreaks(prev: RerollSignal): RerollSignal {
  return Object.keys(prev.streaks).length === 0
    ? prev
    : { streaks: {}, disliked: prev.disliked };
}
