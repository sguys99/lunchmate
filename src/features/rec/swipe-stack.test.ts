import { describe, expect, it } from "vitest";
import {
  SWIPE_DISTANCE_PX,
  SWIPE_VELOCITY_PX,
  keyTarget,
  moveTo,
  swipeStep,
  type SwipeStackState,
} from "./swipe-stack";

describe("swipeStep", () => {
  it("왼쪽으로 기준보다 멀리 밀면 다음, 오른쪽이면 이전", () => {
    expect(swipeStep(-(SWIPE_DISTANCE_PX + 1), 0)).toBe(1);
    expect(swipeStep(SWIPE_DISTANCE_PX + 1, 0)).toBe(-1);
  });

  it("거리가 짧아도 빠르게 튕기면 넘긴다", () => {
    expect(swipeStep(-10, -(SWIPE_VELOCITY_PX + 1))).toBe(1);
    expect(swipeStep(10, SWIPE_VELOCITY_PX + 1)).toBe(-1);
  });

  it("짧고 느리면 제자리", () => {
    expect(swipeStep(-SWIPE_DISTANCE_PX, -SWIPE_VELOCITY_PX)).toBe(0);
    expect(swipeStep(20, 100)).toBe(0);
  });
});

describe("keyTarget", () => {
  it("화살표, Home, End를 위치로 바꾼다", () => {
    expect(keyTarget("ArrowRight", 0, 3)).toBe(1);
    expect(keyTarget("ArrowLeft", 2, 3)).toBe(1);
    expect(keyTarget("Home", 2, 3)).toBe(0);
    expect(keyTarget("End", 0, 3)).toBe(2);
  });

  it("다른 키는 처리하지 않는다", () => {
    expect(keyTarget("Enter", 0, 3)).toBeNull();
    expect(keyTarget("ArrowDown", 0, 3)).toBeNull();
  });
});

describe("moveTo", () => {
  const start: SwipeStackState = { index: 0, direction: 1, dragged: false };

  it("앞으로 가면 방향 1, 뒤로 가면 -1", () => {
    const a = moveTo(start, 2, 3);
    expect(a).toEqual({ index: 2, direction: 1, dragged: false });
    expect(moveTo(a, 1, 3, true)).toEqual({
      index: 1,
      direction: -1,
      dragged: true,
    });
  });

  it("끝에서 멈춘다: 범위 밖이나 같은 위치면 같은 객체", () => {
    expect(moveTo(start, -1, 3)).toBe(start);
    expect(moveTo(start, 0, 3)).toBe(start);
    const last = moveTo(start, 2, 3);
    expect(moveTo(last, 3, 3)).toBe(last);
  });
});
