import { describe, expect, it } from "vitest";
import {
  HIGHLIGHT,
  RESULT_REVEAL_MS,
  ROULETTE_BUDGET_MS,
  highlightSchedule,
  highlightSettleMs,
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

describe("시간 예산", () => {
  it("목표와 시작 카드와 상관없이 결과까지 2초 안에 끝난다", () => {
    for (let target = 0; target < 3; target++) {
      for (let start = 0; start < 3; start++) {
        const total =
          highlightSettleMs(highlightSchedule(3, target, start)) +
          RESULT_REVEAL_MS;
        expect(total, `${target} ${start}`).toBeLessThanOrEqual(
          ROULETTE_BUDGET_MS,
        );
      }
    }
  });

  it("1.2초 이상 보여 준다(룰렛이라는 걸 알 만큼)", () => {
    for (let target = 0; target < 3; target++) {
      expect(
        highlightSettleMs(highlightSchedule(3, target)) + RESULT_REVEAL_MS,
      ).toBeGreaterThanOrEqual(1200);
    }
  });
});
