// 탭 스와이프 시안 쿼리 (T9.14)
import { describe, expect, it } from "vitest";
import { parseSwipeParams } from "./params";

describe("시안 쿼리", () => {
  it("기본은 오늘 탭, 준비 상태, 멈춘 제스처 없음", () => {
    expect(parseSwipeParams({})).toEqual({
      state: "ready",
      tab: "today",
      demo: "none",
    });
  });
  it("demo=end는 마지막 탭(나)에서 시작한다", () => {
    expect(parseSwipeParams({ tab: "map", demo: "end" }).tab).toBe("me");
  });
  it("모르는 값은 기본값", () => {
    expect(parseSwipeParams({ tab: "x", demo: "y", state: "z" })).toEqual({
      state: "ready",
      tab: "today",
      demo: "none",
    });
  });
});
