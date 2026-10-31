// 추천 파이프라인 (REC-03, REC-11, PRD 7장). 브라우저에서 부르는 순수 함수, 무작위는 rng 인자로만.
// 하드 필터(T5.6) → 점수(T5.7) → 세션 제외 + 다양성 제약을 건 상위 10곳 점수 비례 샘플링(T5.8, T5.9) → 이유(T5.10).
import { explain } from "./explain";
import { applyHardFilters } from "./filter";
import type { Rng } from "./pick-one";
import { samplePicks } from "./sample";
import { scoreAll } from "./score";
import type { RecoInput, RecoPick, RecoResult } from "./types";
import { ALGO_VERSION } from "./version";

export function recommend(input: RecoInput, rng: Rng): RecoResult {
  const { candidates, settings, history, seen, now } = input;
  const { kept, filtered } = applyHardFilters(candidates, settings, history);
  const scored = scoreAll(kept, settings, history, now);
  const sampled = samplePicks(scored, rng, { seen });
  const picks: RecoPick[] = sampled.map((s) => {
    const r = explain(s, now);
    return { ...s, reason: r.text, reasonKinds: r.kinds };
  });
  return {
    algoVersion: ALGO_VERSION,
    picks,
    filtered,
    eligibleCount: kept.length,
    unseenCount: kept.filter((c) => !seen.has(c.id)).length,
  };
}
