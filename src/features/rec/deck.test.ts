import { describe, expect, it } from "vitest";
import {
  makeCandidate,
  makeInput,
  manyCandidates,
} from "@/lib/reco/test-fixtures";
import type { RecoInput } from "@/lib/reco/types";
import { drawDeck, refillDeck, shortageOf, widenWalkTo } from "./deck";

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
      drawDeck({ ...input(1), candidates: [...input(1).candidates, over] }, 1)
        .result,
      20,
    );
    expect(s).toEqual({
      kind: "short",
      count: 1,
      widenTo: null,
      overBudget: 1,
    });
  });

  it("도보 단계: 5 → 10 → 15 → 20 → 없음", () => {
    expect(widenWalkTo(5)).toBe(10);
    expect(widenWalkTo(10)).toBe(15);
    expect(widenWalkTo(15)).toBe(20);
    expect(widenWalkTo(20)).toBeNull();
  });
});

describe("refillDeck (다시 안 갈래요, T5.20)", () => {
  const ids = (d: {
    result: { picks: readonly { candidate: { id: string } }[] };
  }) => d.result.picks.map((p) => p.candidate.id);

  it("빈 자리만 새로 채우고 나머지는 자리를 지킨다", () => {
    const first = ids(drawDeck(input(20), 5));
    const [a, b, c] = first as [string, string, string];
    const blocked = new Set([b]);
    const d = refillDeck(input(20, { history: { visits: [], blocked } }), 5, [
      a,
      null,
      c,
    ]);
    const next = ids(d);
    expect(next).toHaveLength(3);
    expect(next[0]).toBe(a);
    expect(next[2]).toBe(c);
    expect(next[1]).not.toBe(b);
    expect(first).not.toContain(next[1]);
    expect(d.recycled).toBe(false);
  });

  it("같은 입력과 시드면 같은 곳으로 채운다", () => {
    const slots = ["p1", null, "p2"];
    expect(ids(refillDeck(input(20), 9, slots))).toEqual(
      ids(refillDeck(input(20), 9, slots)),
    );
  });

  it("다시 안 갈 곳(하드 필터)은 지키던 자리여도 비우고 새로 채운다", () => {
    const history = { visits: [], blocked: new Set(["p1"]) };
    const next = ids(refillDeck(input(20, { history }), 2, ["p1", "p2", "p3"]));
    expect(next).not.toContain("p1");
    expect(next.slice(1)).toEqual(["p2", "p3"]);
    expect(next).toHaveLength(3);
  });

  it("남은 카드까지 세어 같은 카테고리는 2장까지만", () => {
    // p0, p1이 한식이고 나머지도 한식이 많아도 셋째는 다른 카테고리
    const cands = [
      makeCandidate("p0", { category: "hansik" }),
      makeCandidate("p1", { category: "hansik" }),
      makeCandidate("p2", { category: "hansik" }),
      makeCandidate("p3", { category: "hansik" }),
      makeCandidate("p4", { category: "ilsik" }),
    ];
    const d = refillDeck(makeInput({ candidates: cands }), 1, [
      "p0",
      "p1",
      null,
    ]);
    expect(ids(d)).toEqual(["p0", "p1", "p4"]);
  });

  it("세션 제외를 다 썼으면 지금 묶음만 빼고 채운다", () => {
    const seen = new Set(["p2", "p3", "p4"]);
    const d = refillDeck(input(5, { seen }), 4, ["p0", "p1", null]);
    expect(d.recycled).toBe(true);
    const next = ids(d);
    expect(next.slice(0, 2)).toEqual(["p0", "p1"]);
    expect(["p2", "p3", "p4"]).toContain(next[2]);
  });

  it("채울 곳이 없으면 묶음이 줄어든다", () => {
    const d = refillDeck(input(2), 4, ["p0", null, "p1"]);
    expect(ids(d)).toEqual(["p0", "p1"]);
  });
});
