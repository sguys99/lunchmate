// 점수 비례 샘플링 (T5.9, PRD 7장, REC-05, AC-REC-2). 순수 함수, 무작위는 rng 인자로만.
// 1. 이번 세션에 이미 보여 준 곳(seen)을 뺀다.
// 2. 한 장 뽑을 때마다: 다양성 제약(T5.8)을 통과한 남은 후보 중 점수 상위 10곳을 모아 점수 비례로 하나 고른다.
//    상위 10곳은 매 추첨마다 다시 센다. 그래서 상위 10곳이 한 카테고리뿐이어도 그 아래 다른 카테고리가 올라온다.
// 3. rng는 한 장에 한 번 부른다. 같은 시드면 같은 결과다(정렬 동점은 id로 끊는다).
import { PICK_COUNT, SAMPLE_TOP_N, SAMPLE_WEIGHT_FLOOR } from "./constants";
import { diversityEligible } from "./diversity";
import { pickByScore, type Rng } from "./pick-one";
import type { ScoredCandidate } from "./types";

export type SampleOptions = {
  /** 이번 세션에 이미 보여 준 place_id */
  seen?: ReadonlySet<string>;
  count?: number;
  topN?: number;
};

export function sampleWeight(score: number): number {
  return (
    (Number.isFinite(score) ? Math.max(score, 0) : 0) + SAMPLE_WEIGHT_FLOOR
  );
}

/** 점수 내림차순, 같으면 id 오름차순 */
export function byScoreDesc(a: ScoredCandidate, b: ScoredCandidate): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.candidate.id < b.candidate.id
    ? -1
    : a.candidate.id > b.candidate.id
      ? 1
      : 0;
}

export function samplePicks<T extends ScoredCandidate>(
  scored: readonly T[],
  rng: Rng,
  {
    seen = new Set(),
    count = PICK_COUNT,
    topN = SAMPLE_TOP_N,
  }: SampleOptions = {},
): T[] {
  let remaining = scored
    .filter((s) => !seen.has(s.candidate.id))
    .sort(byScoreDesc);
  const picked: T[] = [];
  while (picked.length < count && remaining.length > 0) {
    const pool = diversityEligible(remaining, picked).slice(0, topN);
    const idx = pickByScore(
      pool.map((p) => sampleWeight(p.score)),
      rng,
    );
    const chosen = pool[idx];
    if (chosen === undefined) break;
    picked.push(chosen);
    remaining = remaining.filter((r) => r !== chosen);
  }
  return picked;
}
