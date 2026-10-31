import { describe, expect, it } from "vitest";
import { seededRng } from "./pick-one";
import { samplePicks, sampleWeight } from "./sample";
import { scoreAll } from "./score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
  manyCandidates,
} from "./test-fixtures";
import type { ScoredCandidate } from "./types";

const scored = (n: number) =>
  scoreAll(manyCandidates(n), BASE_SETTINGS, EMPTY_HISTORY, NOW);

/** 점수만 정한 가짜 채점 결과(카테고리는 모두 다르게) */
function fakeScored(scores: number[]): ScoredCandidate[] {
  const slugs = [
    "hansik",
    "jungsik",
    "ilsik",
    "yangsik",
    "bunsik",
    "gukbap",
    "gogi",
    "asian",
    "fastfood",
    "salad",
    "cafe",
    "pub",
  ] as const;
  const base = scoreAll(
    [makeCandidate("x")],
    BASE_SETTINGS,
    EMPTY_HISTORY,
    NOW,
  )[0]!;
  return scores.map((score, i) => ({
    ...base,
    candidate: makeCandidate(`s${i}`, { category: slugs[i % slugs.length]! }),
    score,
  }));
}

describe("점수 비례 샘플링 (T5.9)", () => {
  it("같은 시드면 같은 결과(결정성), 다른 시드면 달라질 수 있다", () => {
    const s = scored(30);
    const ids = (seed: number) =>
      samplePicks(s, seededRng(seed)).map((p) => p.candidate.id);
    expect(ids(42)).toEqual(ids(42));
    const variety = new Set(
      Array.from({ length: 20 }, (_, seed) => ids(seed).join()),
    );
    expect(variety.size).toBeGreaterThan(1);
  });

  it("입력 순서를 바꿔도 같은 시드면 같은 결과", () => {
    const s = scored(30);
    const a = samplePicks(s, seededRng(9)).map((p) => p.candidate.id);
    const b = samplePicks([...s].reverse(), seededRng(9)).map(
      (p) => p.candidate.id,
    );
    expect(a).toEqual(b);
  });

  it("상위 10곳 밖(11위 아래)은 뽑히지 않는다", () => {
    const s = fakeScored(Array.from({ length: 20 }, (_, i) => 1 - i * 0.04));
    const top10 = new Set(s.slice(0, 10).map((x) => x.candidate.id));
    for (let seed = 0; seed < 300; seed++) {
      const first = samplePicks(s, seededRng(seed), { count: 1 })[0]!;
      expect(top10.has(first.candidate.id)).toBe(true);
    }
  });

  it("점수가 높을수록 자주 뽑힌다", () => {
    const s = fakeScored([0.9, 0.1]);
    let high = 0;
    for (let seed = 0; seed < 1000; seed++) {
      if (
        samplePicks(s, seededRng(seed), { count: 1 })[0]!.candidate.id === "s0"
      )
        high++;
    }
    // 무게 0.95 : 0.15 → 약 86%
    expect(high).toBeGreaterThan(780);
    expect(high).toBeLessThan(940);
  });

  it("점수 0 이하도 아주 작은 무게는 남긴다", () => {
    expect(sampleWeight(-0.4)).toBeGreaterThan(0);
    expect(sampleWeight(Number.NaN)).toBeGreaterThan(0);
  });

  it("rng를 한 장에 한 번 부른다", () => {
    let calls = 0;
    const rng = seededRng(1);
    samplePicks(scored(20), () => {
      calls++;
      return rng();
    });
    expect(calls).toBe(3);
  });

  it("한 번 뽑은 곳은 같은 결과에 두 번 나오지 않는다", () => {
    for (let seed = 0; seed < 100; seed++) {
      const ids = samplePicks(scored(5), seededRng(seed)).map(
        (p) => p.candidate.id,
      );
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("세션 제외 목록과 AC-REC-2", () => {
  it("seen에 있는 곳은 뽑지 않는다", () => {
    const s = scored(10);
    const seen = new Set(s.slice(0, 7).map((x) => x.candidate.id));
    const picks = samplePicks(s, seededRng(5), { seen });
    expect(picks).toHaveLength(3);
    for (const p of picks) expect(seen.has(p.candidate.id)).toBe(false);
  });

  it("다시 뽑기를 연속 5회 눌러도 같은 세션에서 같은 식당이 다시 나오지 않는다(후보 45곳)", () => {
    const s = scored(45);
    for (let seed = 0; seed < 50; seed++) {
      const rng = seededRng(seed);
      const seen = new Set<string>();
      for (let round = 0; round < 6; round++) {
        const picks = samplePicks(s, rng, { seen });
        expect(picks).toHaveLength(3);
        for (const p of picks) {
          expect(seen.has(p.candidate.id)).toBe(false);
          seen.add(p.candidate.id);
        }
      }
      expect(seen.size).toBe(18);
    }
  });

  it("남은 후보가 3곳보다 적으면 있는 만큼만, 다 보여 줬으면 0장", () => {
    const s = scored(4);
    const seen = new Set(s.slice(0, 3).map((x) => x.candidate.id));
    expect(samplePicks(s, seededRng(1), { seen })).toHaveLength(1);
    expect(
      samplePicks(s, seededRng(1), {
        seen: new Set(s.map((x) => x.candidate.id)),
      }),
    ).toHaveLength(0);
  });
});
