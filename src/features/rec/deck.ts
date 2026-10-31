// 오늘 카드 묶음 뽑기와 후보 부족 판정 (T5.18, T5.21, REC-05, REC-09). 순수 함수.
//
// - drawDeck: 시드 고정 난수로 엔진(recommend)을 부른다. 같은 입력과 시드면 같은 묶음이다(렌더 중에 불러도 안전).
//   다시 뽑기를 거듭해 이번 세션에서 안 본 곳이 모자라면(AC-REC-2 "후보가 충분할 때"의 끝) 지금 화면의 곳만 빼고
//   처음부터 다시 고르고 recycled로 알린다. 그래도 모자라면 제외 없이 고른다.
// - refillDeck: 다시 안 갈래요(T5.20, REC-08)로 한 자리가 비면 나머지는 그 자리에 두고 빈 자리만 새로 채운다.
//   하드 필터(다시 안 갈 곳 포함)와 다양성 제약(남은 카드까지 센다)을 그대로 지키고, 세션 제외를 다 썼으면 지금 묶음만 뺀다.
// - shortageOf: 0곳이면 empty, 1~2곳이면 short. 넓힐 도보 분(다음 단계)과 예산으로 빠진 수를 함께 준다(PRD 12장).
import { WALK_OPTIONS } from "@/features/onboarding/constants";
import { PICK_COUNT } from "@/lib/reco/constants";
import { explain } from "@/lib/reco/explain";
import { applyHardFilters } from "@/lib/reco/filter";
import { seededRng } from "@/lib/reco/pick-one";
import { recommend } from "@/lib/reco/recommend";
import { samplePicks } from "@/lib/reco/sample";
import { scoreAll } from "@/lib/reco/score";
import type {
  RecoInput,
  RecoPick,
  RecoResult,
  ScoredCandidate,
} from "@/lib/reco/types";
import { ALGO_VERSION } from "@/lib/reco/version";

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

/**
 * 자리를 지키는 묶음 다시 채우기 (T5.20). slots는 지금 묶음 순서의 place_id이고 null이 빈 자리다.
 * 지키던 곳이 이제 하드 필터에 걸리면(다시 안 갈 곳 등) 그 자리도 비운다. 채울 곳이 모자라면 묶음이 줄어든다.
 */
export function refillDeck(
  input: RecoInput,
  seed: number,
  slots: readonly (string | null)[],
): Deck {
  const { candidates, settings, history, seen, now } = input;
  const { kept, filtered } = applyHardFilters(candidates, settings, history);
  const scored = scoreAll(kept, settings, history, now);
  const byId = new Map(scored.map((s) => [s.candidate.id, s]));
  const held = slots.map((id) => (id === null ? null : (byId.get(id) ?? null)));
  const fixed = held.filter((s): s is ScoredCandidate => s !== null);
  const holes = held.length - fixed.length;
  const inDeck = new Set(fixed.map((s) => s.candidate.id));

  let fresh = samplePicks(scored, seededRng(seed), {
    seen: new Set([...seen, ...inDeck]),
    count: holes,
    fixed,
  });
  let recycled = false;
  if (fresh.length < holes && seen.size > 0) {
    fresh = samplePicks(scored, seededRng(seed), {
      seen: inDeck,
      count: holes,
      fixed,
    });
    recycled = true;
  }

  const queue = [...fresh];
  const picks: RecoPick[] = [];
  for (const s of held) {
    const chosen = s ?? queue.shift();
    if (!chosen) continue;
    const r = explain(chosen, now);
    picks.push({ ...chosen, reason: r.text, reasonKinds: r.kinds });
  }
  return {
    result: {
      algoVersion: ALGO_VERSION,
      picks,
      filtered,
      eligibleCount: kept.length,
      unseenCount: kept.filter((c) => !seen.has(c.id)).length,
    },
    recycled,
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
