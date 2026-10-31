import { describe, expect, it } from "vitest";
import {
  makeCandidate,
  makeInput,
  manyCandidates,
} from "@/lib/reco/test-fixtures";
import type { RecoInput } from "@/lib/reco/types";
import { drawDeck, shortageOf, widenWalkTo } from "./deck";

function input(n: number, over: Partial<RecoInput> = {}): RecoInput {
  return makeInput({ candidates: manyCandidates(n), ...over });
}

describe("drawDeck", () => {
  it("같은 입력과 시드면 같은 묶음이다", () => {
    const a = drawDeck(input(12), 7);
    const b = drawDeck(input(12), 7);
    expect(a.result.picks.map((p) => p.candidate.id)).toEqual(
      b.result.picks.map((p) => p.candidate.id),
    );
    expect(a.recycled).toBe(false);
  });

  it("다시 뽑기 5회 동안 같은 곳이 다시 나오지 않는다(AC-REC-2, 후보 충분)", () => {
    let seen = new Set<string>();
    const all: string[] = [];
    for (let k = 0; k < 6; k++) {
      const d = drawDeck(input(30, { seen }), 100 + k);
      const ids = d.result.picks.map((p) => p.candidate.id);
      expect(d.recycled).toBe(false);
      all.push(...ids);
      seen = new Set([...seen, ...ids]);
    }
    expect(new Set(all).size).toBe(all.length);
  });

  it("세션 제외를 다 쓰면 지금 화면의 곳만 빼고 처음부터 다시 고른다", () => {
    const seen = new Set(["p0", "p1", "p2", "p3"]);
    const d = drawDeck(input(5, { seen }), 3, new Set(["p3", "p4"]));
    expect(d.recycled).toBe(true);
    const ids = d.result.picks.map((p) => p.candidate.id);
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain("p3");
    expect(ids).not.toContain("p4");
  });

  it("후보가 3곳보다 적으면 제외가 없어도 recycled가 아니다", () => {
    const d = drawDeck(input(2), 1);
    expect(d.result.picks).toHaveLength(2);
    expect(d.recycled).toBe(false);
  });
});

describe("후보 부족 (REC-09)", () => {
  it("3곳이면 none", () => {
    expect(shortageOf(drawDeck(input(5), 1).result, 10)).toEqual({
      kind: "none",
    });
  });

  it("0곳이면 empty, 다음 도보 단계를 제안한다", () => {
    const s = shortageOf(drawDeck(input(0), 1).result, 10);
    expect(s).toEqual({ kind: "empty", count: 0, widenTo: 15, overBudget: 0 });
  });

  it("1~2곳이면 short, 예산으로 빠진 수를 함께 준다", () => {
    const over = makeCandidate("x", {
      priceReport: { medianKRW: 50_000, count: 3 },
    });
    const s = shortageOf(
      drawDeck(
        { ...input(1), candidates: [...input(1).candidates, over] },
        1,
      ).result,
      20,
    );
    expect(s).toEqual({ kind: "short", count: 1, widenTo: null, overBudget: 1 });
  });

  it("도보 단계: 5 → 10 → 15 → 20 → 없음", () => {
    expect(widenWalkTo(5)).toBe(10);
    expect(widenWalkTo(10)).toBe(15);
    expect(widenWalkTo(15)).toBe(20);
    expect(widenWalkTo(20)).toBeNull();
  });
});
