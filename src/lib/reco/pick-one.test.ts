import { describe, expect, it } from "vitest";
import { pickByScore, pickProbabilities, seededRng } from "./pick-one";

const fixed = (v: number) => () => v;

describe("pickByScore", () => {
  it("rng 값이 누적 점수 구간에 따라 번호를 고른다", () => {
    const scores = [1, 2, 1]; // 구간 [0, .25) [.25, .75) [.75, 1)
    expect(pickByScore(scores, fixed(0))).toBe(0);
    expect(pickByScore(scores, fixed(0.24))).toBe(0);
    expect(pickByScore(scores, fixed(0.25))).toBe(1);
    expect(pickByScore(scores, fixed(0.74))).toBe(1);
    expect(pickByScore(scores, fixed(0.75))).toBe(2);
    expect(pickByScore(scores, fixed(0.9999999))).toBe(2);
  });

  it("같은 시드면 같은 순서로 고른다(결정성)", () => {
    const scores = [0.82, 0.64, 0.71];
    const run = (seed: number) => {
      const rng = seededRng(seed);
      return Array.from({ length: 20 }, () => pickByScore(scores, rng));
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(7));
  });

  it("rng를 한 번만 부른다", () => {
    let calls = 0;
    pickByScore([1, 1, 1], () => {
      calls++;
      return 0.5;
    });
    expect(calls).toBe(1);
  });

  it("많이 뽑으면 점수 비율에 가까워진다", () => {
    const scores = [3, 1, 0];
    const rng = seededRng(2026);
    const counts = [0, 0, 0];
    const n = 20000;
    for (let i = 0; i < n; i++) counts[pickByScore(scores, rng)]!++;
    expect(counts[0]! / n).toBeCloseTo(0.75, 1);
    expect(counts[1]! / n).toBeCloseTo(0.25, 1);
    expect(counts[2]).toBe(0); // 점수 0은 뽑히지 않는다
  });

  it("점수가 모두 0이거나 잘못된 값이면 균등하게 고른다", () => {
    expect(pickByScore([0, 0, 0], fixed(0))).toBe(0);
    expect(pickByScore([0, 0, 0], fixed(0.5))).toBe(1);
    expect(pickByScore([Number.NaN, -1, 0], fixed(0.99))).toBe(2);
    expect(pickByScore([Number.NaN, 2, Infinity], fixed(0.99))).toBe(1);
  });

  it("exclude한 곳은 고르지 않는다(다시 고르기)", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) {
      expect(pickByScore([5, 1, 1], rng, { exclude: 0 })).not.toBe(0);
    }
    expect(pickByScore([0, 0, 0], fixed(0), { exclude: 0 })).toBe(1);
  });

  it("후보가 하나뿐이면 exclude를 무시하고, 없으면 -1", () => {
    expect(pickByScore([1], fixed(0.3), { exclude: 0 })).toBe(0);
    expect(pickByScore([], fixed(0.3))).toBe(-1);
  });

  it("rng가 범위를 벗어나도 안전하다", () => {
    expect(pickByScore([1, 1], fixed(1))).toBe(1);
    expect(pickByScore([1, 1], fixed(-0.5))).toBe(0);
  });
});

describe("pickProbabilities", () => {
  it("점수에 비례하고 합이 1이다", () => {
    const p = pickProbabilities([0.82, 0.64, 0.71]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p[0]).toBeCloseTo(0.82 / 2.17, 10);
  });

  it("exclude와 균등 규칙이 pickByScore와 같다", () => {
    expect(pickProbabilities([2, 1, 1], { exclude: 0 })).toEqual([0, 0.5, 0.5]);
    expect(pickProbabilities([0, 0, 0], { exclude: 1 })).toEqual([0.5, 0, 0.5]);
  });
});

describe("seededRng", () => {
  it("0 이상 1 미만을 돌려준다", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
