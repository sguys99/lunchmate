// 오늘 카드 묶음 뽑기와 후보 부족 판정 (T5.18, T5.21, REC-05, REC-09). 순수 함수.
//
// - drawDeck: 시드 고정 난수로 엔진(recommend)을 부른다. 같은 입력과 시드면 같은 묶음이다(렌더 중에 불러도 안전).
//   다시 뽑기를 거듭해 이번 세션에서 안 본 곳이 모자라면(AC-REC-2 "후보가 충분할 때"의 끝) 지금 화면의 곳만 빼고
//   처음부터 다시 고르고 recycled로 알린다. 그래도 모자라면 제외 없이 고른다.
// - shortageOf: 0곳이면 empty, 1~2곳이면 short. 넓힐 도보 분(다음 단계)과 예산으로 빠진 수를 함께 준다(PRD 12장).
import { WALK_OPTIONS } from "@/features/onboarding/constants";
import { PICK_COUNT } from "@/lib/reco/constants";
import { seededRng } from "@/lib/reco/pick-one";
import { recommend } from "@/lib/reco/recommend";
import type { RecoInput, RecoResult } from "@/lib/reco/types";

export type Deck = {
  result: RecoResult;
  /** 세션 제외를 다 써서 처음부터 다시 고른 묶음 */
  recycled: boolean;
};

export function drawDeck(
  input: RecoInput,
  seed: number,
  /** 다시 고를 때도 빼고 싶은 곳(지금 화면의 곳) */
  fallbackExclude: ReadonlySet<string> = new Set(),
): Deck {
  const first = recommend(input, seededRng(seed));
  const want = Math.min(PICK_COUNT, first.eligibleCount);
  if (first.picks.length >= want || input.seen.size === 0) {
    return { result: first, recycled: false };
  }
  const second = recommend(
    { ...input, seen: fallbackExclude },
    seededRng(seed),
  );
  if (second.picks.length >= want) return { result: second, recycled: true };
  return {
    result: recommend({ ...input, seen: new Set() }, seededRng(seed)),
    recycled: true,
  };
}

/** 지금 도보 분보다 한 단계 넓은 값(5, 10, 15, 20). 이미 가장 넓으면 null */
export function widenWalkTo(walk: number): number | null {
  return WALK_OPTIONS.find((w) => w > walk) ?? null;
}

type ShortageDetail = {
  /** 보여 줄 수 있는 곳 수(0~2) */
  count: number;
  /** 넓힐 도보 분. 더 넓힐 수 없으면 null */
  widenTo: number | null;
  /** 예산 조건(제보 가격)으로 빠진 곳 수. 예산을 이미 풀었으면 0 */
  overBudget: number;
};

export type Shortage =
  | { kind: "none" }
  | ({ kind: "empty" } & ShortageDetail)
  | ({ kind: "short" } & ShortageDetail);

export function shortageOf(result: RecoResult, walkMinutes: number): Shortage {
  const count = result.picks.length;
  if (count >= PICK_COUNT) return { kind: "none" };
  const detail: ShortageDetail = {
    count,
    widenTo: widenWalkTo(walkMinutes),
    overBudget: result.filtered.overBudget,
  };
  return count === 0
    ? { kind: "empty", ...detail }
    : { kind: "short", ...detail };
}
