import { describe, expect, it } from "vitest";
import {
  HIGHLIGHT,
  RESULT_REVEAL_MS,
  ROULETTE_BUDGET_MS,
  ROULETTE_MODES,
  highlightSchedule,
  isRouletteMode,
  rollingStrip,
  settleMs,
} from "./roulette";

describe("highlightSchedule", () => {
  it.each([0, 1, 2])(
    "목표 %i에서 멈추고 첫 칸은 0ms의 시작 카드다",
    (target) => {
      const steps = highlightSchedule(3, target);
      expect(steps[0]).toEqual({ index: 0, atMs: 0 });
      expect(steps.at(-1)?.index).toBe(target);
    },
  );

  it("최소 두 바퀴를 돌고 칸은 하나씩 옆으로 옮긴다", () => {
    const steps = highlightSchedule(3, 0, 1);
    expect(steps.length - 1).toBeGreaterThanOrEqual(HIGHLIGHT.minLaps * 3);
    steps.slice(1).forEach((s, k) => {
      expect(s.index).toBe((steps[k]!.index + 1) % 3);
    });
  });

  it("간격이 점점 늘어난다(감속)", () => {
    const steps = highlightSchedule(3, 2);
    const gaps = steps.slice(1).map((s, k) => s.atMs - steps[k]!.atMs);
    for (let k = 1; k < gaps.length; k++) {
      expect(gaps[k]).toBeGreaterThanOrEqual(gaps[k - 1]!);
    }
    expect(gaps[0]).toBeLessThan(gaps.at(-1)!);
  });

  it("잘못된 입력은 빈 목록, 한 곳이면 바로 멈춘다", () => {
    expect(highlightSchedule(0, 0)).toEqual([]);
    expect(highlightSchedule(3, 3)).toEqual([]);
    expect(highlightSchedule(1, 0)).toEqual([{ index: 0, atMs: 0 }]);
  });
});

describe("rollingStrip", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [0, 2],
  ])(
    "목표 %i, 시작 %i: 띠의 마지막이 목표이고 첫 칸은 시작",
    (target, start) => {
      const { order, stopAt } = rollingStrip(3, target, start);
      expect(order[stopAt]).toBe(target);
      expect(stopAt).toBe(order.length - 1);
      expect(order[0]).toBe(start);
      expect(order.length).toBeGreaterThan(2 * 3);
    },
  );
});

describe("시간 예산", () => {
  it("모든 안이 목표와 상관없이 결과까지 2초 안에 끝난다", () => {
    for (const mode of ROULETTE_MODES) {
      for (let target = 0; target < 3; target++) {
        for (let start = 0; start < 3; start++) {
          const total =
            settleMs(mode, highlightSchedule(3, target, start)) +
            RESULT_REVEAL_MS;
          expect(total, `${mode} ${target} ${start}`).toBeLessThanOrEqual(
            ROULETTE_BUDGET_MS,
          );
        }
      }
    }
  });

  it("r1, r2는 1.2초 이상 보여 준다(룰렛이라는 걸 알 만큼)", () => {
    expect(settleMs("r2") + RESULT_REVEAL_MS).toBeGreaterThanOrEqual(1200);
    for (let target = 0; target < 3; target++) {
      expect(
        settleMs("r1", highlightSchedule(3, target)) + RESULT_REVEAL_MS,
      ).toBeGreaterThanOrEqual(1200);
    }
  });

  it("isRouletteMode", () => {
    expect(isRouletteMode("r2")).toBe(true);
    expect(isRouletteMode("r4")).toBe(false);
  });
});
