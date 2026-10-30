import { describe, expect, it } from "vitest";
import { landingCopy } from "@/copy/landing";
import { reasonWithoutWalk } from "@/features/rec/reason";
import { roundLabel, setIndex } from "./rounds";

describe("setIndex", () => {
  it("묶음 수로 돌아간다", () => {
    expect([0, 1, 2, 3, 4].map((r) => setIndex(r, 3))).toEqual([0, 1, 2, 0, 1]);
  });
  it("묶음이 없거나 이상한 값이면 0", () => {
    expect(setIndex(5, 0)).toBe(0);
    expect(setIndex(Number.NaN, 3)).toBe(0);
    expect(setIndex(-1, 3)).toBe(2);
  });
});

describe("roundLabel", () => {
  it("1부터 센다", () => {
    expect(roundLabel(0, 3)).toBe("1/3");
    expect(roundLabel(3, 3)).toBe("1/3");
    expect(roundLabel(2, 3)).toBe("3/3");
  });
});

describe("데모 묶음 (DESIGN.md 5장 랜딩, CLAUDE.md 6.2)", () => {
  const sets = landingCopy.demo.sets;
  it("묶음마다 3장, 같은 카테고리는 2장까지, id는 전체에서 겹치지 않는다", () => {
    const ids = sets.flat().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const set of sets) {
      expect(set).toHaveLength(3);
      const counts = new Map<string, number>();
      for (const p of set)
        counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    }
  });
  it("이유 문장에 도보 분이 없다(숫자 칸과 중복)", () => {
    for (const p of sets.flat()) {
      expect(reasonWithoutWalk(p.reason)).toBe(p.reason);
      expect(p.reason).not.toMatch(/도보/);
    }
  });
});
