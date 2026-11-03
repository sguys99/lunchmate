// @vitest-environment jsdom
// 탭 스와이프 판정 규칙 (T9.14, D-36)
import { describe, expect, it } from "vitest";
import {
  canStartAt,
  dragState,
  EDGE_GUARD_PX,
  isIgnoredTarget,
  lockAxis,
  neighborIndex,
  releaseTarget,
  resist,
  RUBBER_MAX_PX,
} from "./gesture";

const W = 390;

describe("시작 자리", () => {
  it("화면 가장자리 24px(iOS 뒤로 가기 자리)에서는 시작하지 않는다", () => {
    expect(canStartAt(EDGE_GUARD_PX - 1, W)).toBe(false);
    expect(canStartAt(W - EDGE_GUARD_PX + 1, W)).toBe(false);
    expect(canStartAt(EDGE_GUARD_PX, W)).toBe(true);
    expect(canStartAt(W / 2, W)).toBe(true);
  });
});

describe("방향 잠금", () => {
  it("10px 전에는 판정하지 않는다", () => {
    expect(lockAxis(6, 3)).toBeNull();
  });
  it("가로가 세로의 1.5배를 넘어야 가로", () => {
    expect(lockAxis(16, 10)).toBe("x");
    expect(lockAxis(15, 10)).toBe("y");
    expect(lockAxis(2, 12)).toBe("y");
  });
});

describe("옆 탭과 고무줄", () => {
  it("왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전 탭", () => {
    expect(dragState(-50, 1, 4, W).target).toBe(2);
    expect(dragState(50, 1, 4, W).target).toBe(0);
  });
  it("양 끝에서는 옆 탭이 없고 1/4만 따라오다 48px에서 멈춘다", () => {
    expect(neighborIndex(0, -1, 4)).toBeNull();
    expect(neighborIndex(3, 1, 4)).toBeNull();
    const s = dragState(-400, 3, 4, W);
    expect(s.target).toBeNull();
    expect(s.offset).toBe(-RUBBER_MAX_PX);
    expect(s.armed).toBe(false);
    expect(resist(-40, false)).toBe(-10);
  });
  it("기준선(폭 30%)에 닿으면 armed", () => {
    expect(dragState(-W * 0.29, 0, 4, W).armed).toBe(false);
    expect(dragState(-W * 0.3, 0, 4, W).armed).toBe(true);
    expect(dragState(-W * 0.15, 0, 4, W).progress).toBeCloseTo(0.5);
  });
});

describe("손을 뗄 때", () => {
  it("기준선을 넘겼으면 옮긴다", () => {
    expect(releaseTarget(-W * 0.31, 0, 0, 4, W)).toBe(1);
  });
  it("기준선 전이라도 같은 방향으로 빠르게 튕기면(40px 이상) 옮긴다", () => {
    expect(releaseTarget(-60, -0.8, 0, 4, W)).toBe(1);
    expect(releaseTarget(-30, -0.8, 0, 4, W)).toBeNull();
  });
  it("밀었다가 되돌리며 놓으면(속도 반대) 제자리", () => {
    expect(releaseTarget(-60, 0.8, 0, 4, W)).toBeNull();
  });
  it("양 끝은 옮기지 않는다", () => {
    expect(releaseTarget(-W, -2, 3, 4, W)).toBeNull();
  });
});

describe("받지 않는 자리", () => {
  it("data-swipe-ignore 안, 입력칸, 가로 스크롤 줄에서 시작한 손가락은 버린다", () => {
    document.body.innerHTML = `
      <div id="c">
        <div data-swipe-ignore><span id="map">지도</span></div>
        <input id="i" />
        <div id="row" style="overflow-x:auto"><span id="chip">칩</span></div>
        <p id="ok">본문</p>
      </div>`;
    const c = document.getElementById("c")!;
    const row = document.getElementById("row")!;
    Object.defineProperty(row, "scrollWidth", { value: 600 });
    Object.defineProperty(row, "clientWidth", { value: 300 });
    expect(isIgnoredTarget(document.getElementById("map"), c)).toBe(true);
    expect(isIgnoredTarget(document.getElementById("i"), c)).toBe(true);
    expect(isIgnoredTarget(document.getElementById("chip"), c)).toBe(true);
    expect(isIgnoredTarget(document.getElementById("ok"), c)).toBe(false);
  });
});
