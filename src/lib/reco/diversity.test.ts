import { describe, expect, it } from "vitest";
import type { CategorySlug } from "@/features/place/categories";
import { categoryCounts, diversityEligible } from "./diversity";
import { seededRng } from "./pick-one";
import { samplePicks } from "./sample";
import { scoreAll } from "./score";
import {
  BASE_SETTINGS,
  EMPTY_HISTORY,
  NOW,
  makeCandidate,
} from "./test-fixtures";

const item = (id: string, category: CategorySlug) => ({
  id,
  candidate: { category },
});

describe("diversityEligible (T5.8)", () => {
  it("이미 2장 뽑힌 카테고리는 남은 추첨에서 뺀다", () => {
    const picked = [item("a", "hansik"), item("b", "hansik")];
    const remaining = [item("c", "hansik"), item("d", "ilsik")];
    expect(diversityEligible(remaining, picked).map((r) => r.id)).toEqual([
      "d",
    ]);
  });

  it("1장이면 아직 뺄 필요 없다", () => {
    const picked = [item("a", "hansik")];
    const remaining = [item("c", "hansik"), item("d", "ilsik")];
    expect(diversityEligible(remaining, picked).map((r) => r.id)).toEqual([
      "c",
      "d",
    ]);
  });

  it("남은 후보가 모두 찬 카테고리뿐이면 제약을 푼다", () => {
    const picked = [item("a", "hansik"), item("b", "hansik")];
    const remaining = [item("c", "hansik")];
    expect(diversityEligible(remaining, picked).map((r) => r.id)).toEqual([
      "c",
    ]);
  });

  it("categoryCounts", () => {
    expect(
      categoryCounts([
        item("a", "hansik"),
        item("b", "hansik"),
        item("c", "pub"),
      ]).get("hansik"),
    ).toBe(2);
  });
});

describe("AC-REC-3: 후보 카테고리가 2종 이상이면 3장이 모두 같은 카테고리인 경우는 없다", () => {
  it("상위 10곳 이상이 모두 한식이고 다른 카테고리가 맨 아래여도 3번째 장은 다른 카테고리", () => {
    const candidates = [
      ...Array.from({ length: 15 }, (_, i) =>
        makeCandidate(`h${i}`, { category: "hansik", distanceM: 50 + i }),
      ),
      makeCandidate("far-ilsik", { category: "ilsik", distanceM: 500 }),
    ];
    const scored = scoreAll(candidates, BASE_SETTINGS, EMPTY_HISTORY, NOW);
    for (let seed = 0; seed < 200; seed++) {
      const picks = samplePicks(scored, seededRng(seed));
      expect(picks).toHaveLength(3);
      expect(
        new Set(picks.map((p) => p.candidate.category)).size,
      ).toBeGreaterThanOrEqual(2);
      expect(picks[2]!.candidate.id).toBe("far-ilsik");
    }
  });

  it("카테고리가 한 종뿐이면 3장을 채운다(제약 완화)", () => {
    const scored = scoreAll(
      Array.from({ length: 5 }, (_, i) => makeCandidate(`h${i}`)),
      BASE_SETTINGS,
      EMPTY_HISTORY,
      NOW,
    );
    expect(samplePicks(scored, seededRng(3))).toHaveLength(3);
  });
});
