import { describe, expect, it } from "vitest";
import { seededRng } from "./pick-one";
import { recommend } from "./recommend";
import {
  BASE_SETTINGS,
  makeCandidate,
  makeInput,
  manyCandidates,
} from "./test-fixtures";
import { ALGO_VERSION } from "./version";

describe("recommend 파이프라인 (REC-03)", () => {
  it("결과에 algo_version과 이유가 실리고, 같은 시드면 같은 결과", () => {
    const input = makeInput({ candidates: manyCandidates(30) });
    const a = recommend(input, seededRng(7));
    const b = recommend(input, seededRng(7));
    expect(a.algoVersion).toBe(ALGO_VERSION);
    expect(a.picks).toHaveLength(3);
    expect(a.picks.map((p) => p.candidate.id)).toEqual(
      b.picks.map((p) => p.candidate.id),
    );
    for (const p of a.picks) expect(p.reason.length).toBeGreaterThan(0);
  });

  it("필터로 빠진 수와 남은 수를 돌려준다(REC-09 완화 제안용)", () => {
    const candidates = [
      makeCandidate("a", { priceReport: { medianKRW: 30_000, count: 2 } }),
      makeCandidate("b", { closedReports: 3 }),
      ...manyCandidates(2),
    ];
    const r = recommend(
      makeInput({ candidates, seen: new Set(["p0"]) }),
      seededRng(1),
    );
    expect(r.filtered).toEqual({
      avoid: 0,
      blocked: 0,
      closed: 1,
      overBudget: 1,
    });
    expect(r.eligibleCount).toBe(2);
    expect(r.unseenCount).toBe(1);
    expect(r.picks).toHaveLength(1);
  });
});

describe("AC-REC-1: 기피로 지정한 식당은 어떤 경우에도 카드에 나오지 않는다", () => {
  const settings = {
    ...BASE_SETTINGS,
    avoid: [{ kind: "food" as const, value: "회" }],
  };

  it("점수가 가장 높고 다시 뽑기를 거듭해도 나오지 않는다", () => {
    const avoided = makeCandidate("avoid-me", {
      name: "가까운 횟집",
      distanceM: 10,
      thumbs: { up: 50, down: 0 },
    });
    const candidates = [avoided, ...manyCandidates(20)];
    for (let seed = 0; seed < 50; seed++) {
      const seen = new Set<string>();
      const rng = seededRng(seed);
      for (let round = 0; round < 7; round++) {
        const r = recommend(makeInput({ candidates, settings, seen }), rng);
        for (const p of r.picks) {
          expect(p.candidate.id).not.toBe("avoid-me");
          seen.add(p.candidate.id);
        }
      }
    }
  });

  it("후보가 기피 식당뿐이면 카드가 0장이다(채우려고 기피를 풀지 않는다)", () => {
    const candidates = [
      makeCandidate("a", { name: "횟집 1" }),
      makeCandidate("b", { name: "횟집 2" }),
    ];
    const r = recommend(makeInput({ candidates, settings }), seededRng(1));
    expect(r.picks).toHaveLength(0);
    expect(r.filtered.avoid).toBe(2);
  });
});

describe("AC-REC-2 (파이프라인): 다시 뽑기 5회 연속, 같은 세션에서 같은 식당이 다시 나오지 않는다", () => {
  it("45곳에서 6번 뽑아 18곳이 모두 다르다", () => {
    const candidates = manyCandidates(45);
    const seen = new Set<string>();
    const rng = seededRng(2026);
    for (let round = 0; round < 6; round++) {
      const r = recommend(makeInput({ candidates, seen }), rng);
      expect(r.picks).toHaveLength(3);
      for (const p of r.picks) {
        expect(seen.has(p.candidate.id)).toBe(false);
        seen.add(p.candidate.id);
      }
    }
  });
});
