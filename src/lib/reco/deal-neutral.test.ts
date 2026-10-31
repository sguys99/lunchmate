// T5.11: 할인 정보 미반영 테스트 자리 (AC-DEAL-2는 6단계 DEAL 구현 때 완성).
// 6단계에서 할인 데이터가 Candidate에 실제로 붙으면(place_deals 집계) 여기 경우를 늘린다.
import { describe, expect, it } from "vitest";
import { seededRng } from "./pick-one";
import { recommend } from "./recommend";
import { makeScoreContext, scoreCandidate } from "./score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
  makeInput,
  manyCandidates,
} from "./test-fixtures";

describe("AC-DEAL-2: 할인 정보가 있는 식당과 없는 식당의 추천 점수는 다른 조건이 같으면 동일하다", () => {
  const ctx = makeScoreContext(BASE_SETTINGS, EMPTY_HISTORY, NOW);

  it("deal 필드 유무와 값에 따라 점수, 요소, 이유 근거가 달라지지 않는다", () => {
    const base = makeCandidate("a", {
      thumbs: { up: 5, down: 1 },
      distanceM: 250,
    });
    const variants = [
      { ...base, deal: undefined },
      { ...base, deal: null },
      { ...base, deal: { active: false } },
      { ...base, deal: { active: true } },
    ];
    const results = variants.map((c) => scoreCandidate(c, ctx));
    for (const r of results) {
      expect(r.score).toBe(results[0]!.score);
      expect(r.factors).toEqual(results[0]!.factors);
      expect(r.evidence).toEqual(results[0]!.evidence);
    }
  });

  it("같은 시드면 할인 유무와 관계없이 같은 카드가 뽑힌다", () => {
    const plain = manyCandidates(30);
    const withDeals = plain.map((c, i) => ({
      ...c,
      deal: { active: i % 2 === 0 },
    }));
    const a = recommend(makeInput({ candidates: plain }), seededRng(11));
    const b = recommend(makeInput({ candidates: withDeals }), seededRng(11));
    expect(b.picks.map((p) => p.candidate.id)).toEqual(
      a.picks.map((p) => p.candidate.id),
    );
    expect(b.picks.map((p) => p.score)).toEqual(a.picks.map((p) => p.score));
    expect(b.picks.map((p) => p.reason)).toEqual(a.picks.map((p) => p.reason));
  });
});
